import { MemoryRepository } from '@/data/memoryRepository';
import type { SyncOp } from '@/domain/sync';
import type { TransactionInput } from '@/domain/transactions';
import { createInitialData } from '@/domain/walletData';
import { DEFAULT_WALLET_ID } from '@/domain/wallets';

import { createWalletStore, ValidationError } from '../walletStore';

const now = new Date('2026-10-28T03:00:00.000Z');

const input: TransactionInput = {
  type: 'expense',
  amount: 35000,
  walletId: DEFAULT_WALLET_ID,
  categoryId: 'exp-food',
  transactionDate: '2026-10-28',
};

async function setup(repository = new MemoryRepository(createInitialData('Ví chính', now))) {
  let n = 0;
  const committed: SyncOp[][] = [];
  const store = createWalletStore({
    now: () => now,
    newId: () => `id-${++n}`,
    defaultWalletName: () => 'Main wallet',
    onCommitted: (ops) => {
      committed.push(ops);
    },
  });
  await store.getState().open(repository);
  return { store, repository, committed };
}

describe('walletStore', () => {
  it('loads, adds, edits and deletes, persisting and reporting each change', async () => {
    const { store, repository, committed } = await setup();
    expect(store.getState().status).toBe('ready');

    const id = await store.getState().addTransaction(input);
    expect(id).toBe('id-1');
    expect(repository.saved?.transactions).toHaveLength(1);

    await store.getState().editTransaction('id-1', { ...input, amount: 40000 });
    expect(repository.saved?.transactions[0].amount).toBe(40000);

    await store.getState().deleteTransaction('id-1');
    expect(repository.saved?.transactions).toEqual([]);
    expect(store.getState().data?.transactions).toEqual([]);

    expect(committed.map((ops) => ops.map((op) => `${op.kind}:${op.id}`))).toEqual([
      ['upsert:id-1'],
      ['upsert:id-1'],
      ['delete:id-1'],
    ]);
  });

  it('creates fresh data with a named default wallet on first open, without reporting it', async () => {
    const { store, repository, committed } = await setup(new MemoryRepository());
    expect(store.getState().data?.wallets).toEqual([expect.objectContaining({ name: 'Main wallet', isDefault: true })]);
    expect(repository.saved).not.toBeNull();
    // The first sync decides what to push, so fresh defaults never overwrite server data.
    expect(committed).toEqual([]);
  });

  it('serializes concurrent mutations without losing updates', async () => {
    const { store, repository } = await setup();
    await Promise.all([
      store.getState().addTransaction(input),
      store.getState().addTransaction({ ...input, amount: 1 }),
      store.getState().addTransaction({ ...input, amount: 2 }),
    ]);
    expect(repository.saved?.transactions.map((t) => t.amount)).toEqual([35000, 1, 2]);
  });

  it('rejects invalid input without saving', async () => {
    const { store, repository, committed } = await setup();
    const before = repository.saved;
    await expect(store.getState().addTransaction({ ...input, amount: -1 })).rejects.toBeInstanceOf(ValidationError);
    await expect(store.getState().addTransaction({ ...input, walletId: 'nope' })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.saved).toBe(before);
    expect(committed).toEqual([]);
  });

  it('keeps state unchanged and reports nothing when saving fails', async () => {
    const { store, repository, committed } = await setup();
    repository.failNextSave = true;
    await expect(store.getState().addTransaction(input)).rejects.toThrow('write_failed');
    expect(store.getState().data?.transactions).toEqual([]);
    expect(committed).toEqual([]);

    await store.getState().addTransaction(input);
    expect(store.getState().data?.transactions).toHaveLength(1);
  });

  it('only allows budgets on expense categories', async () => {
    const { store } = await setup();
    await store.getState().setBudget('exp-food', 2_000_000);
    expect(store.getState().data?.budgets).toEqual([{ categoryId: 'exp-food', limit: 2_000_000 }]);
    await expect(store.getState().setBudget('inc-salary', 1)).rejects.toThrow('category_invalid');
  });

  it('manages wallets and transfers between them', async () => {
    const { store } = await setup();
    const bank = await store.getState().addWallet({
      name: 'Techcombank',
      kind: 'bank',
      color: '#0EA5E9',
      openingBalance: 1_000_000,
      isDefault: false,
    });
    await store.getState().addTransaction({ type: 'transfer', amount: 5000, walletId: DEFAULT_WALLET_ID, toWalletId: bank, transactionDate: '2026-10-28' });
    await expect(store.getState().deleteWallet(bank)).rejects.toThrow('wallet_in_use');
    await store.getState().archiveWallet(bank);
    expect(store.getState().data?.wallets.find((w) => w.id === bank)?.archived).toBe(true);
    await expect(
      store.getState().addWallet({ name: '', kind: 'cash', color: '#000', openingBalance: 0, isDefault: false }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('restores data even after a failed load', async () => {
    const repository = new MemoryRepository();
    repository.failLoad = new Error('corrupt');
    const { store } = await setup(repository);
    expect(store.getState().status).toBe('error');

    const restored = createInitialData('Ví chính', now);
    await store.getState().replaceAll(restored);
    expect(store.getState().status).toBe('ready');
    expect(repository.saved).toEqual(restored);
  });

  it('applies remote changes without reporting them, skipping rows that would make the data invalid', async () => {
    const { store, committed } = await setup();
    await store.getState().applyRemote([{ table: 'budgets', id: 'exp-food', record: { categoryId: 'exp-food', limit: 9 } }], new Set());
    expect(store.getState().data?.budgets).toEqual([{ categoryId: 'exp-food', limit: 9 }]);
    expect(committed).toEqual([]);

    // A budget on an income category is invalid; the valid change next to it still applies.
    await store.getState().applyRemote(
      [
        { table: 'budgets', id: 'inc-salary', record: { categoryId: 'inc-salary', limit: 9 } },
        { table: 'budgets', id: 'exp-transport', record: { categoryId: 'exp-transport', limit: 5 } },
      ],
      new Set(),
    );
    expect(store.getState().data?.budgets).toEqual([
      { categoryId: 'exp-food', limit: 9 },
      { categoryId: 'exp-transport', limit: 5 },
    ]);
  });

  it('closes and ignores a slow load for a previous user', async () => {
    const { store } = await setup();
    store.getState().close();
    expect(store.getState().data).toBeNull();
    await expect(store.getState().addTransaction(input)).rejects.toThrow('not_loaded');
  });

  it('manages user categories and syncs them like other records', async () => {
    const { store, repository, committed } = await setup();
    const id = await store.getState().addCategory({ name: 'Cà phê', type: 'expense', icon: 'cafe', color: '#F97316' }, ['Ăn uống']);
    expect(repository.saved?.categories.find((c) => c.id === id)).toMatchObject({ name: 'Cà phê' });

    await expect(
      store.getState().addCategory({ name: 'ăn uống', type: 'expense', icon: 'cafe', color: '#F97316' }, ['Ăn uống']),
    ).rejects.toBeInstanceOf(ValidationError);

    await store.getState().setBudget(id, 500_000);
    await store.getState().deleteCategory(id);
    expect(repository.saved?.categories.some((c) => c.id === id)).toBe(false);
    expect(repository.saved?.budgets).toEqual([]);
    expect(committed.at(-1)?.map((op) => `${op.kind}:${op.table}:${op.id}`).sort()).toEqual(
      [`delete:budgets:${id}`, `delete:categories:${id}`].sort(),
    );
  });

  it('restores an archived wallet', async () => {
    const { store } = await setup();
    const id = await store.getState().addWallet({ name: 'Bank', kind: 'bank', color: '#0EA5E9', openingBalance: 0, isDefault: false });
    await store.getState().archiveWallet(id);
    await store.getState().unarchiveWallet(id);
    expect(store.getState().data?.wallets.find((w) => w.id === id)?.archived).toBe(false);
  });

  it('adds recurring rules with their due occurrences and protects the wallet they use', async () => {
    const { store, committed } = await setup();
    const bank = await store.getState().addWallet({ name: 'Bank', kind: 'bank', color: '#0EA5E9', openingBalance: 0, isDefault: false });
    const id = await store
      .getState()
      .addRecurring(
        { type: 'expense', amount: 100_000, walletId: bank, categoryId: 'exp-bills', frequency: 'weekly', startDate: '2026-10-19' },
        '2026-10-28',
      );
    expect(store.getState().data?.transactions.map((t) => t.id)).toEqual([`${id}@2026-10-19`, `${id}@2026-10-26`]);
    expect(store.getState().data?.recurring[0].nextDate).toBe('2026-11-02');
    expect(committed.at(-1)?.map((op) => op.table).sort()).toEqual(['recurring', 'transactions', 'transactions']);

    await expect(store.getState().deleteWallet(bank)).rejects.toThrow('wallet_in_use');

    await store.getState().setRecurringPaused(id, true, '2026-11-09');
    await store.getState().runRecurring('2026-11-09');
    expect(store.getState().data?.transactions).toHaveLength(2);
    await store.getState().setRecurringPaused(id, false, '2026-11-09');
    expect(store.getState().data?.transactions).toHaveLength(4);

    await store.getState().deleteRecurring(id);
    expect(store.getState().data?.recurring).toEqual([]);
    expect(store.getState().data?.transactions).toHaveLength(4);
  });
});
