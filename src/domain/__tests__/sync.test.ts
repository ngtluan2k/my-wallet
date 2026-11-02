import {
  applyRemoteChanges,
  applyRemoteChangesSafely,
  compactOps,
  diffWalletData,
  supersededByRemote,
  syncKey,
  type SyncOp,
} from '../sync';
import type { WalletData } from '../types';
import { createTransaction } from '../transactions';
import { createInitialData, parseWalletData } from '../walletData';

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

describe('supersededByRemote', () => {
  it('drops a pending local edit only when the server copy is newer', () => {
    const local = { ...base, transactions: [{ ...t1, updatedAt: '2026-10-28T10:00:00.000Z' }] };
    const pending = new Set([syncKey('transactions', 't1'), syncKey('budgets', 'exp-food')]);
    const newer = { ...t1, amount: 9, updatedAt: '2026-10-28T11:00:00.000Z' };
    const older = { ...t1, amount: 9, updatedAt: '2026-10-28T09:00:00.000Z' };
    expect([...supersededByRemote(local, [{ table: 'transactions', id: 't1', record: newer }], pending)]).toEqual(['transactions:t1']);
    expect(supersededByRemote(local, [{ table: 'transactions', id: 't1', record: older }], pending).size).toBe(0);
    // No timestamps on budgets, and remote deletions: the local pending change is kept.
    expect(supersededByRemote(local, [{ table: 'budgets', id: 'exp-food', record: { categoryId: 'exp-food', limit: 1 } }], pending).size).toBe(0);
    expect(supersededByRemote(local, [{ table: 'transactions', id: 't1' }], pending).size).toBe(0);
  });
});

describe('applyRemoteChangesSafely', () => {
  const validate = (d: WalletData) => {
    const parsed = parseWalletData(d);
    return parsed.ok ? parsed.data : null;
  };

  it('skips a bad row but keeps coupled valid changes together', () => {
    const bank = { ...base.wallets[0], id: 'bank', name: 'Bank', isDefault: false };
    const data = { ...base, wallets: [...base.wallets, bank] };
    const result = applyRemoteChangesSafely(
      data,
      [
        // Moving the default flag needs both rows at once; either alone is invalid.
        { table: 'wallets', id: 'wallet-default', record: { ...base.wallets[0], isDefault: false } },
        { table: 'wallets', id: 'bank', record: { ...bank, isDefault: true } },
        { table: 'transactions', id: 'bad', record: { ...t1, id: 'bad', amount: -5 } },
        { table: 'transactions', id: 't1', record: t1 },
      ],
      new Set(),
      validate,
    );
    expect(result.skipped.map((c) => c.id)).toEqual(['bad']);
    expect(result.data.wallets.find((w) => w.isDefault)?.id).toBe('bank');
    expect(result.data.transactions.map((t) => t.id)).toEqual(['t1']);
  });
});
