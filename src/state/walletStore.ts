import { createStore } from 'zustand/vanilla';

import { removeBudget, setBudget } from '@/domain/budgets';
import {
  addCategory,
  deleteCategory,
  editCategory,
  validateCategoryInput,
  type CategoryError,
  type CategoryInput,
} from '@/domain/categories';
import { applyRemoteChangesSafely, diffWalletData, type RemoteChange, type SyncOp } from '@/domain/sync';
import {
  createTransaction,
  updateTransaction,
  validateTransactionInput,
  type TransactionError,
  type TransactionInput,
} from '@/domain/transactions';
import {
  createRecurringRule,
  generateDueTransactions,
  ruleUsesWallet,
  updateRecurringRule,
  validateRecurringInput,
  type RecurringInput,
} from '@/domain/recurring';
import type { LocalDate, WalletData } from '@/domain/types';
import { createInitialData, parseWalletData } from '@/domain/walletData';
import {
  addWallet,
  archiveWallet,
  deleteWallet,
  unarchiveWallet,
  editWallet,
  validateWalletInput,
  type WalletError,
  type WalletInput,
} from '@/domain/wallets';
import type { WalletRepository } from '@/data/WalletRepository';

export class ValidationError<E extends string = TransactionError> extends Error {
  constructor(readonly errors: E[]) {
    super(errors.join(','));
    this.name = 'ValidationError';
  }
}

export interface WalletState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: WalletData | null;
  loadError: unknown;
  /** Switches to a repository (one per signed-in user) and loads it. */
  open(repository: WalletRepository): Promise<void>;
  /** Re-reads the current repository, e.g. after a failed load. */
  load(): Promise<void>;
  /** Forgets the open repository and its data, e.g. on sign-out. */
  close(): void;
  addTransaction(input: TransactionInput): Promise<string>;
  editTransaction(id: string, input: TransactionInput): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  setBudget(categoryId: string, limit: number): Promise<void>;
  removeBudget(categoryId: string): Promise<void>;
  addWallet(input: WalletInput): Promise<string>;
  editWallet(id: string, input: WalletInput): Promise<void>;
  archiveWallet(id: string): Promise<void>;
  deleteWallet(id: string): Promise<void>;
  unarchiveWallet(id: string): Promise<void>;
  /** `takenNames`: translated names of the other categories of the same type, for duplicate checks. */
  addCategory(input: CategoryInput, takenNames: string[]): Promise<string>;
  editCategory(id: string, input: Omit<CategoryInput, 'type'>, takenNames: string[]): Promise<void>;
  /** Unused user categories only; also removes the category's budget. */
  deleteCategory(id: string): Promise<void>;
  /** Creates the rule, plus any occurrences already due (start date in the past). */
  addRecurring(input: RecurringInput, today: LocalDate): Promise<string>;
  editRecurring(id: string, input: RecurringInput, today: LocalDate): Promise<void>;
  setRecurringPaused(id: string, paused: boolean, today: LocalDate): Promise<void>;
  /** Deletes the rule; transactions it already created stay. */
  deleteRecurring(id: string): Promise<void>;
  /** Creates every recurring occurrence due up to `today`. */
  runRecurring(today: LocalDate): Promise<void>;
  /** Replaces all data, e.g. when restoring a backup. `data` must already be validated. */
  replaceAll(data: WalletData): Promise<void>;
  /** Clears every transaction, budget and wallet, keeping one fresh default wallet. */
  resetData(): Promise<void>;
  /** Applies changes pulled from the server. Not reported to `onCommitted`, since they came from there. */
  applyRemote(changes: RemoteChange[], pending: Set<string>): Promise<void>;
}

export interface WalletStoreDeps {
  now?: () => Date;
  newId?: () => string;
  /** Name for the wallet created with fresh data, in the user's language. */
  defaultWalletName?: () => string;
  /**
   * Called after a local change is saved, with the record-level operations it made. Used to queue
   * changes for sync. Failures here never undo the saved change.
   */
  onCommitted?: (ops: SyncOp[]) => Promise<void> | void;
}

const defaultId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function createWalletStore({
  now = () => new Date(),
  newId = defaultId,
  defaultWalletName = () => 'Ví chính',
  onCommitted,
}: WalletStoreDeps = {}) {
  // Mutations run one at a time so each computes from the latest saved state.
  let queue: Promise<unknown> = Promise.resolve();
  let repository: WalletRepository | null = null;
  // Bumped on open/close so a slow load for a previous user can't publish its result.
  let generation = 0;

  return createStore<WalletState>()((set, get) => {
    function enqueue<T>(task: () => Promise<T>): Promise<T> {
      const run = queue.then(task);
      queue = run.catch(() => undefined);
      return run;
    }

    function requireRepository(): WalletRepository {
      if (!repository) throw new Error('not_open');
      return repository;
    }

    async function report(ops: SyncOp[]) {
      if (!ops.length || !onCommitted) return;
      try {
        await onCommitted(ops);
      } catch {
        // The change is saved locally; a later full sync re-pushes anything missing on the server.
      }
    }

    /** Computes the next state, saves it, and only then publishes it. A failed save changes nothing. */
    function mutate(change: (data: WalletData) => WalletData, { sync = true } = {}): Promise<void> {
      return enqueue(async () => {
        const current = get().data;
        if (!current) throw new Error('not_loaded');
        const next = change(current);
        if (next === current) return;
        await requireRepository().save(next);
        set({ data: next });
        if (sync) await report(diffWalletData(current, next));
      });
    }

    function checkTransaction(data: WalletData, input: TransactionInput, existingId?: string) {
      const existing = existingId ? data.transactions.find((t) => t.id === existingId) : undefined;
      const errors = validateTransactionInput(input, data.categories, data.wallets, existing);
      if (errors.length) throw new ValidationError(errors);
    }

    function checkWallet(data: WalletData, input: WalletInput, editingId?: string) {
      const errors = validateWalletInput(input, data.wallets, editingId);
      if (errors.length) throw new ValidationError<WalletError>(errors);
    }

    async function load() {
      const repo = requireRepository();
      const gen = generation;
      set({ status: 'loading', loadError: null });
      try {
        const stored = await repo.load();
        if (gen !== generation) return;
        if (stored) {
          set({ status: 'ready', data: stored });
          return;
        }
        // First run for this user on this device. Not reported for sync: the first full sync pushes
        // only what the server lacks, so fresh defaults never overwrite the user's existing data.
        const fresh = createInitialData(defaultWalletName(), now());
        await repo.save(fresh);
        if (gen !== generation) return;
        set({ status: 'ready', data: fresh });
      } catch (error) {
        if (gen === generation) set({ status: 'error', data: null, loadError: error });
      }
    }

    return {
      status: 'idle',
      data: null,
      loadError: null,

      async open(repo) {
        generation++;
        repository = repo;
        set({ status: 'idle', data: null, loadError: null });
        await enqueue(load);
      },

      load: () => enqueue(load),

      close() {
        generation++;
        repository = null;
        set({ status: 'idle', data: null, loadError: null });
      },

      async addTransaction(input) {
        const id = newId();
        await mutate((data) => {
          checkTransaction(data, input);
          return { ...data, transactions: [...data.transactions, createTransaction(input, id, now())] };
        });
        return id;
      },

      editTransaction: (id, input) =>
        mutate((data) => {
          if (!data.transactions.some((t) => t.id === id)) throw new Error('not_found');
          checkTransaction(data, input, id);
          return {
            ...data,
            transactions: data.transactions.map((t) => (t.id === id ? updateTransaction(t, input, now()) : t)),
          };
        }),

      deleteTransaction: (id) =>
        mutate((data) => {
          if (!data.transactions.some((t) => t.id === id)) throw new Error('not_found');
          return { ...data, transactions: data.transactions.filter((t) => t.id !== id) };
        }),

      setBudget: (categoryId, limit) =>
        mutate((data) => {
          if (data.categories.find((c) => c.id === categoryId)?.type !== 'expense') throw new Error('category_invalid');
          return { ...data, budgets: setBudget(data.budgets, categoryId, limit) };
        }),

      removeBudget: (categoryId) =>
        mutate((data) => {
          if (!data.budgets.some((b) => b.categoryId === categoryId)) return data;
          return { ...data, budgets: removeBudget(data.budgets, categoryId) };
        }),

      async addWallet(input) {
        const id = newId();
        await mutate((data) => {
          checkWallet(data, input);
          return { ...data, wallets: addWallet(data.wallets, input, id, now()) };
        });
        return id;
      },

      editWallet: (id, input) =>
        mutate((data) => {
          if (!data.wallets.some((w) => w.id === id)) throw new Error('not_found');
          checkWallet(data, input, id);
          return { ...data, wallets: editWallet(data.wallets, id, input, now()) };
        }),

      archiveWallet: (id) => mutate((data) => ({ ...data, wallets: archiveWallet(data.wallets, id, now()) })),

      deleteWallet: (id) =>
        mutate((data) => {
          if (ruleUsesWallet(data.recurring, id)) throw new Error('wallet_in_use');
          return { ...data, wallets: deleteWallet(data.wallets, data.transactions, id, now()) };
        }),

      unarchiveWallet: (id) =>
        mutate((data) => {
          if (!data.wallets.some((w) => w.id === id)) throw new Error('not_found');
          return { ...data, wallets: unarchiveWallet(data.wallets, id, now()) };
        }),

      async addCategory(input, takenNames) {
        const id = newId();
        await mutate((data) => {
          const errors = validateCategoryInput(input, takenNames);
          if (errors.length) throw new ValidationError<CategoryError>(errors);
          return { ...data, categories: addCategory(data.categories, input, id) };
        });
        return id;
      },

      editCategory: (id, input, takenNames) =>
        mutate((data) => {
          const target = data.categories.find((c) => c.id === id);
          if (!target) throw new Error('not_found');
          const errors = validateCategoryInput({ ...input, type: target.type }, takenNames);
          if (errors.length) throw new ValidationError<CategoryError>(errors);
          return { ...data, categories: editCategory(data.categories, id, input) };
        }),

      deleteCategory: (id) => mutate((data) => ({ ...data, ...deleteCategory(data, id) })),

      async addRecurring(input, today) {
        const id = newId();
        await mutate((data) => {
          const errors = validateRecurringInput(input, data);
          if (errors.length) throw new ValidationError(errors);
          const next = { ...data, recurring: [...data.recurring, createRecurringRule(input, id, now())] };
          return generateDueTransactions(next, today, now());
        });
        return id;
      },

      editRecurring: (id, input, today) =>
        mutate((data) => {
          const rule = data.recurring.find((r) => r.id === id);
          if (!rule) throw new Error('not_found');
          const errors = validateRecurringInput(input, data);
          if (errors.length) throw new ValidationError(errors);
          const next = { ...data, recurring: data.recurring.map((r) => (r.id === id ? updateRecurringRule(r, input, now()) : r)) };
          return generateDueTransactions(next, today, now());
        }),

      setRecurringPaused: (id, paused, today) =>
        mutate((data) => {
          const rule = data.recurring.find((r) => r.id === id);
          if (!rule) throw new Error('not_found');
          if (!!rule.paused === paused) return data;
          const { paused: _old, ...rest } = rule;
          const updated = { ...rest, ...(paused ? { paused: true } : {}), updatedAt: now().toISOString() };
          const next = { ...data, recurring: data.recurring.map((r) => (r.id === id ? updated : r)) };
          return paused ? next : generateDueTransactions(next, today, now());
        }),

      deleteRecurring: (id) =>
        mutate((data) => {
          if (!data.recurring.some((r) => r.id === id)) return data;
          return { ...data, recurring: data.recurring.filter((r) => r.id !== id) };
        }),

      runRecurring: (today) => mutate((data) => generateDueTransactions(data, today, now())),

      // Works even when loading failed: restoring a backup is how users recover from a corrupt file.
      replaceAll: (replacement) =>
        enqueue(async () => {
          const previous = get().data;
          await requireRepository().save(replacement);
          set({ status: 'ready', data: replacement, loadError: null });
          await report(diffWalletData(previous, replacement));
        }),

      resetData: () =>
        enqueue(async () => {
          const previous = get().data;
          const fresh = createInitialData(defaultWalletName(), now());
          await requireRepository().save(fresh);
          set({ status: 'ready', data: fresh, loadError: null });
          await report(diffWalletData(previous, fresh));
        }),

      // A server row that fails validation is skipped (and pulled again next time) instead of
      // blocking every other change.
      applyRemote: (changes, pending) =>
        mutate(
          (data) => {
            const result = applyRemoteChangesSafely(data, changes, pending, (candidate) => {
              const parsed = parseWalletData(candidate);
              return parsed.ok ? parsed.data : null;
            });
            if (result.skipped.length && __DEV__) {
              console.warn('[sync] skipped invalid server rows', result.skipped.map((c) => `${c.table}:${c.id}`));
            }
            return result.data;
          },
          { sync: false },
        ),
    };
  });
}
