import { applyRemoteChanges, compactOps, diffWalletData, syncKey, type SyncOp } from '../sync';
import { createTransaction } from '../transactions';
import { createInitialData } from '../walletData';

const now = new Date('2026-10-28T03:00:00.000Z');
const base = createInitialData('Ví chính', now);
const t1 = createTransaction(
  { type: 'expense', amount: 1000, walletId: 'wallet-default', categoryId: 'exp-food', transactionDate: '2026-10-28' },
  't1',
  now,
);

describe('diffWalletData', () => {
  it('lists every record for fresh data', () => {
    const ops = diffWalletData(null, base);
    expect(ops).toHaveLength(base.wallets.length + base.categories.length);
    expect(ops[0]).toMatchObject({ table: 'wallets', kind: 'upsert' });
  });

  it('reports only changed records, upserts before deletes', () => {
    const withTx = { ...base, transactions: [t1], budgets: [{ categoryId: 'exp-food', limit: 5 }] };
    expect(diffWalletData(base, withTx).map((op) => [op.table, op.id, op.kind])).toEqual([
      ['transactions', 't1', 'upsert'],
      ['budgets', 'exp-food', 'upsert'],
    ]);
    // Same content in a new object with a different key order is not a change.
    const reordered = { ...withTx, transactions: [{ ...JSON.parse(JSON.stringify(t1)) }] };
    expect(diffWalletData(withTx, reordered)).toEqual([]);
    expect(diffWalletData(withTx, base).map((op) => [op.table, op.id, op.kind])).toEqual([
      ['budgets', 'exp-food', 'delete'],
      ['transactions', 't1', 'delete'],
    ]);
  });
});

describe('compactOps', () => {
  it('keeps only the latest op per record', () => {
    const ops: SyncOp[] = [
      { table: 'transactions', id: 'a', kind: 'upsert', record: t1 },
      { table: 'transactions', id: 'b', kind: 'upsert', record: t1 },
      { table: 'transactions', id: 'a', kind: 'delete' },
    ];
    expect(compactOps(ops).map((op) => [op.id, op.kind])).toEqual([
      ['b', 'upsert'],
      ['a', 'delete'],
    ]);
  });
});

describe('applyRemoteChanges', () => {
  const local = { ...base, transactions: [t1] };

  it('adds, replaces and deletes records', () => {
    const t2 = { ...t1, id: 't2' };
    const merged = applyRemoteChanges(
      local,
      [
        { table: 'transactions', id: 't2', record: t2 },
        { table: 'transactions', id: 't1' },
        { table: 'budgets', id: 'exp-food', record: { categoryId: 'exp-food', limit: 7 } },
      ],
      new Set(),
    );
    expect(merged.transactions).toEqual([t2]);
    expect(merged.budgets).toEqual([{ categoryId: 'exp-food', limit: 7 }]);
  });

  it('never overwrites records with pending local changes', () => {
    const merged = applyRemoteChanges(
      local,
      [{ table: 'transactions', id: 't1', record: { ...t1, amount: 999 } }],
      new Set([syncKey('transactions', 't1')]),
    );
    expect(merged.transactions[0].amount).toBe(1000);
  });

  it('returns the same object when there is nothing to apply', () => {
    expect(applyRemoteChanges(local, [], new Set())).toBe(local);
  });
});
