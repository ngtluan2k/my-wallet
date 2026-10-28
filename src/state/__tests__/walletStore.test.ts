import { MemoryRepository } from '@/data/memoryRepository';
import type { TransactionInput } from '@/domain/transactions';
import { createInitialData } from '@/domain/walletData';

import { createWalletStore, ValidationError } from '../walletStore';

const input: TransactionInput = {
  type: 'expense',
  amount: 35000,
  categoryId: 'exp-food',
  transactionDate: '2026-10-28',
};

function setup(repository = new MemoryRepository()) {
  let n = 0;
  const store = createWalletStore({
    repository,
    now: () => new Date('2026-10-28T03:00:00.000Z'),
    newId: () => `id-${++n}`,
  });
  return { store, repository };
}

describe('walletStore', () => {
  it('loads, adds, edits and deletes, persisting each change', async () => {
    const { store, repository } = setup();
    await store.getState().load();
    expect(store.getState().status).toBe('ready');

    await store.getState().addTransaction(input);
    expect(repository.saved?.transactions).toHaveLength(1);

    await store.getState().editTransaction('id-1', { ...input, amount: 40000 });
    expect(repository.saved?.transactions[0].amount).toBe(40000);

    await store.getState().deleteTransaction('id-1');
    expect(repository.saved?.transactions).toEqual([]);
    expect(store.getState().data?.transactions).toEqual([]);
  });

  it('serializes concurrent mutations without losing updates', async () => {
    const { store, repository } = setup();
    await store.getState().load();
    await Promise.all([
      store.getState().addTransaction(input),
      store.getState().addTransaction({ ...input, amount: 1 }),
      store.getState().addTransaction({ ...input, amount: 2 }),
    ]);
    expect(repository.saved?.transactions.map((t) => t.amount)).toEqual([35000, 1, 2]);
  });

  it('rejects invalid input without saving', async () => {
    const { store, repository } = setup();
    await store.getState().load();
    await expect(store.getState().addTransaction({ ...input, amount: -1 })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.saved).toBeNull();
  });

  it('keeps state unchanged when saving fails', async () => {
    const { store, repository } = setup();
    await store.getState().load();
    repository.failNextSave = true;
    await expect(store.getState().addTransaction(input)).rejects.toThrow('write_failed');
    expect(store.getState().data?.transactions).toEqual([]);

    await store.getState().addTransaction(input);
    expect(store.getState().data?.transactions).toHaveLength(1);
  });

  it('only allows budgets on expense categories', async () => {
    const { store } = setup();
    await store.getState().load();
    await store.getState().setBudget('exp-food', 2_000_000);
    expect(store.getState().data?.budgets).toEqual([{ categoryId: 'exp-food', limit: 2_000_000 }]);
    await expect(store.getState().setBudget('inc-salary', 1)).rejects.toThrow('category_invalid');
  });

  it('restores data even after a failed load', async () => {
    const repository = new MemoryRepository();
    repository.load = async () => {
      throw new Error('corrupt');
    };
    const { store } = setup(repository);
    await store.getState().load();
    expect(store.getState().status).toBe('error');

    await store.getState().replaceAll(createInitialData());
    expect(store.getState().status).toBe('ready');
    expect(repository.saved).toEqual(createInitialData());
  });
});
