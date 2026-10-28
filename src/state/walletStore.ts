import { createStore, type StoreApi } from 'zustand/vanilla';

import { removeBudget, setBudget } from '@/domain/budgets';
import {
  createTransaction,
  updateTransaction,
  validateTransactionInput,
  type TransactionError,
  type TransactionInput,
} from '@/domain/transactions';
import type { WalletData } from '@/domain/types';
import type { WalletRepository } from '@/data/WalletRepository';

export class ValidationError extends Error {
  constructor(readonly errors: TransactionError[]) {
    super(errors.join(','));
    this.name = 'ValidationError';
  }
}

export interface WalletState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: WalletData | null;
  loadError: unknown;
  load(): Promise<void>;
  addTransaction(input: TransactionInput): Promise<void>;
  editTransaction(id: string, input: TransactionInput): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  setBudget(categoryId: string, limit: number): Promise<void>;
  removeBudget(categoryId: string): Promise<void>;
  /** Replaces all data, e.g. when restoring a backup. `data` must already be validated. */
  replaceAll(data: WalletData): Promise<void>;
}

export interface WalletStoreDeps {
  repository: WalletRepository;
  now?: () => Date;
  newId?: () => string;
}

const defaultId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function createWalletStore({ repository, now = () => new Date(), newId = defaultId }: WalletStoreDeps) {
  // Mutations run one at a time so each computes from the latest saved state.
  let queue: Promise<unknown> = Promise.resolve();

  return createStore<WalletState>()((set, get) => {
    /** Applies `change` to current data, persists it, and only then publishes it. */
    function enqueue(task: () => Promise<void>): Promise<void> {
      const run = queue.then(task);
      queue = run.catch(() => undefined);
      return run;
    }

    function mutate(change: (data: WalletData) => WalletData): Promise<void> {
      return enqueue(async () => {
        const current = get().data;
        if (!current) throw new Error('not_loaded');
        const next = change(current);
        await repository.save(next);
        set({ data: next });
      });
    }

    function validate(data: WalletData, input: TransactionInput) {
      const errors = validateTransactionInput(input, data.categories);
      if (errors.length) throw new ValidationError(errors);
    }

    return {
      status: 'idle',
      data: null,
      loadError: null,

      async load() {
        set({ status: 'loading', loadError: null });
        try {
          set({ status: 'ready', data: await repository.load() });
        } catch (error) {
          set({ status: 'error', loadError: error });
        }
      },

      addTransaction: (input) =>
        mutate((data) => {
          validate(data, input);
          return { ...data, transactions: [...data.transactions, createTransaction(input, newId(), now())] };
        }),

      editTransaction: (id, input) =>
        mutate((data) => {
          validate(data, input);
          const existing = data.transactions.find((t) => t.id === id);
          if (!existing) throw new Error('not_found');
          return {
            ...data,
            transactions: data.transactions.map((t) => (t.id === id ? updateTransaction(t, input, now()) : t)),
          };
        }),

      deleteTransaction: (id) =>
        mutate((data) => ({ ...data, transactions: data.transactions.filter((t) => t.id !== id) })),

      setBudget: (categoryId, limit) =>
        mutate((data) => {
          if (data.categories.find((c) => c.id === categoryId)?.type !== 'expense') throw new Error('category_invalid');
          return { ...data, budgets: setBudget(data.budgets, categoryId, limit) };
        }),

      removeBudget: (categoryId) => mutate((data) => ({ ...data, budgets: removeBudget(data.budgets, categoryId) })),

      // Works even when loading failed: restoring a backup is how users recover from a corrupt file.
      replaceAll: (replacement) =>
        enqueue(async () => {
          await repository.save(replacement);
          set({ status: 'ready', data: replacement, loadError: null });
        }),
    };
  });
}

export type WalletStore = StoreApi<WalletState>;
