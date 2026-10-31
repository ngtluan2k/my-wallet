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
import { syncService } from '@/services/syncService';

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
        try {
          await repository.save(next);
          set({ data: next });
        } catch (error) {
          // Even if Supabase fails, local save may have succeeded in repository.
          // Update UI optimistically and enqueue for background sync.
          set({ data: next });
          throw error;
        }
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
          // Trigger background sync of any pending operations
          syncService.syncPendingOperations().catch(() => undefined);
        } catch (error) {
          set({ status: 'error', loadError: error });
        }
      },

      addTransaction: async (input) => {
        const current = get().data;
        if (!current) throw new Error('not_loaded');
        const id = newId();
        const timestamp = now().toISOString();
        const transaction = createTransaction(input, id, now());

        try {
          await mutate((data) => {
            validate(data, input);
            return {
              ...data,
              transactions: [...data.transactions, transaction],
            };
          });
        } catch (error) {
          // Optimistically update already done in mutate; enqueue for sync
          await syncService.enqueueTransaction(id, 'INSERT', {
            ...input,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          throw error;
        }
      },

      editTransaction: async (id, input) => {
        const current = get().data;
        if (!current) throw new Error('not_loaded');
        const existing = current.transactions.find((t) => t.id === id);
        if (!existing) throw new Error('not_found');
        const timestamp = now().toISOString();

        try {
          await mutate((data) => {
            validate(data, input);
            return {
              ...data,
              transactions: data.transactions.map((t) =>
                t.id === id ? updateTransaction(t, input, now()) : t,
              ),
            };
          });
        } catch (error) {
          await syncService.enqueueTransaction(id, 'UPDATE', {
            type: input.type,
            amount: input.amount,
            categoryId: input.categoryId,
            transactionDate: input.transactionDate,
            note: input.note,
            createdAt: existing.createdAt,
            updatedAt: timestamp,
          });
          throw error;
        }
      },

      deleteTransaction: async (id) => {
        const current = get().data;
        if (!current) throw new Error('not_loaded');
        const existing = current.transactions.find((t) => t.id === id);
        if (!existing) throw new Error('not_found');

        try {
          await mutate((data) => ({ ...data, transactions: data.transactions.filter((t) => t.id !== id) }));
        } catch (error) {
          await syncService.enqueueTransaction(id, 'DELETE', {
            type: existing.type,
            amount: existing.amount,
            categoryId: existing.categoryId,
            transactionDate: existing.transactionDate,
            note: existing.note,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
          });
          throw error;
        }
      },

      setBudget: async (categoryId, limit) => {
        const current = get().data;
        if (!current) throw new Error('not_loaded');
        if (current.categories.find((c) => c.id === categoryId)?.type !== 'expense') throw new Error('category_invalid');
        const monthKey = new Date().toISOString().slice(0, 7);

        try {
          await mutate((data) => ({ ...data, budgets: setBudget(data.budgets, categoryId, limit) }));
        } catch (error) {
          await syncService.enqueueBudget(categoryId, 'INSERT', {
            categoryId,
            monthKey,
            limit,
          });
          throw error;
        }
      },

      removeBudget: async (categoryId) => {
        const current = get().data;
        if (!current) throw new Error('not_loaded');
        const existing = current.budgets.find((b) => b.categoryId === categoryId);
        if (!existing) throw new Error('not_found');

        try {
          await mutate((data) => ({ ...data, budgets: removeBudget(data.budgets, categoryId) }));
        } catch (error) {
          await syncService.enqueueBudget(categoryId, 'DELETE', {
            categoryId: existing.categoryId,
            limit: existing.limit,
            monthKey: new Date().toISOString().slice(0, 7),
          });
          throw error;
        }
      },

      // Works even when loading failed: restoring a backup is how users recover from a corrupt file.
      replaceAll: async (replacement) => {
        await enqueue(async () => {
          await repository.save(replacement);
          set({ status: 'ready', data: replacement, loadError: null });
        });
      },

      triggerSync: async () => {
        try {
          await syncService.syncPendingOperations();
        } catch {
          // Silently fail for UI; background sync continues on its own
        }
      },
    };
  });
}

export type WalletStore = StoreApi<WalletState>;