import { DEFAULT_CATEGORIES } from '../categories';
import { createTransaction } from '../transactions';
import type { WalletData } from '../types';
import {
  BACKUP_APP_ID,
  CURRENT_VERSION,
  createInitialData,
  MIGRATED_WALLET_NAME,
  parseBackup,
  parseWalletData,
  parseWalletJson,
  serializeBackup,
} from '../walletData';
import { DEFAULT_WALLET_ID } from '../wallets';

const now = new Date('2026-10-28T03:00:00.000Z');

function sampleData(): WalletData {
  const data = createInitialData('Ví chính', now);
  const bank = { ...data.wallets[0], id: 'bank', name: 'Ngân hàng', kind: 'bank' as const, isDefault: false };
  return {
    ...data,
    wallets: [...data.wallets, bank],
    transactions: [
      createTransaction(
        { type: 'expense', amount: 45000, walletId: DEFAULT_WALLET_ID, categoryId: 'exp-food', transactionDate: '2026-10-28', note: 'Bún chả' },
        't1',
        now,
      ),
      createTransaction(
        { type: 'transfer', amount: 100000, walletId: 'bank', toWalletId: DEFAULT_WALLET_ID, transactionDate: '2026-10-28' },
        't2',
        now,
      ),
    ],
    budgets: [{ categoryId: 'exp-food', limit: 3_000_000 }],
    debts: [
      {
        id: 'd1',
        direction: 'lent',
        person: 'Minh',
        amount: 200_000,
        walletId: DEFAULT_WALLET_ID,
        date: '2026-10-20',
        settledDate: '2026-10-28',
        settleWalletId: 'bank',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
  };
}

/** A version 1 file as the original app wrote it: no wallets, no walletId. */
function v1File(extra: Record<string, unknown> = {}) {
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES,
    budgets: [{ categoryId: 'exp-food', limit: 1_000_000 }],
    transactions: [
      {
        id: 'a',
        type: 'expense',
        amount: 30000,
        categoryId: 'exp-food',
        transactionDate: '2026-10-01',
        createdAt: '2026-10-01T05:00:00.000Z',
        updatedAt: '2026-10-01T05:00:00.000Z',
      },
      {
        id: 'b',
        type: 'income',
        amount: 5_000_000,
        categoryId: 'inc-salary',
        transactionDate: '2026-09-25',
        createdAt: '2026-09-25T02:00:00.000Z',
        updatedAt: '2026-09-25T02:00:00.000Z',
      },
    ],
    ...extra,
  };
}

describe('parseWalletData', () => {
  it('accepts initial and populated data', () => {
    expect(parseWalletData(createInitialData('Ví chính', now))).toEqual({ ok: true, data: createInitialData('Ví chính', now) });
    expect(parseWalletData(sampleData())).toEqual({ ok: true, data: sampleData() });
  });

  it('rejects newer versions', () => {
    expect(parseWalletData({ ...sampleData(), version: CURRENT_VERSION + 1 })).toEqual({
      ok: false,
      error: 'unsupported_version',
    });
  });

  it.each<[string, (d: WalletData) => unknown]>([
    ['missing version', ({ version: _v, ...rest }) => rest],
    ['float amount', (d) => ({ ...d, transactions: [{ ...d.transactions[0], amount: 1.5 }] })],
    ['bad date', (d) => ({ ...d, transactions: [{ ...d.transactions[0], transactionDate: '28/10/2026' }] })],
    ['bad time', (d) => ({ ...d, transactions: [{ ...d.transactions[0], transactionTime: '7:5' }] })],
    ['unknown category', (d) => ({ ...d, transactions: [{ ...d.transactions[0], categoryId: 'nope' }] })],
    ['type mismatch', (d) => ({ ...d, transactions: [{ ...d.transactions[0], type: 'income' }] })],
    ['duplicate ids', (d) => ({ ...d, transactions: [d.transactions[0], d.transactions[0]] })],
    ['unknown wallet', (d) => ({ ...d, transactions: [{ ...d.transactions[0], walletId: 'nope' }] })],
    ['transfer to same wallet', (d) => ({ ...d, transactions: [{ ...d.transactions[1], toWalletId: 'bank' }] })],
    ['transfer with category', (d) => ({ ...d, transactions: [{ ...d.transactions[1], categoryId: 'exp-food' }] })],
    ['two default wallets', (d) => ({ ...d, wallets: d.wallets.map((w) => ({ ...w, isDefault: true })) })],
    ['no default wallet', (d) => ({ ...d, wallets: d.wallets.map((w) => ({ ...w, isDefault: false })) })],
    ['negative opening balance', (d) => ({ ...d, wallets: [{ ...d.wallets[0], openingBalance: -1 }, d.wallets[1]] })],
    ['budget on income category', (d) => ({ ...d, budgets: [{ categoryId: 'inc-salary', limit: 1 }] })],
    ['duplicate budgets', (d) => ({ ...d, budgets: [...d.budgets, ...d.budgets] })],
    ['not an array', (d) => ({ ...d, categories: {} })],
    ['debt on unknown wallet', (d) => ({ ...d, debts: [{ ...d.debts[0], walletId: 'nope' }] })],
    ['debt settled into unknown wallet', (d) => ({ ...d, debts: [{ ...d.debts[0], settleWalletId: 'nope' }] })],
    ['debt settled without wallet', (d) => ({ ...d, debts: [{ ...d.debts[0], settleWalletId: undefined }] })],
    ['debt settled before it started', (d) => ({ ...d, debts: [{ ...d.debts[0], settledDate: '2026-10-01' }] })],
    ['debt with blank person', (d) => ({ ...d, debts: [{ ...d.debts[0], person: ' ' }] })],
    ['debt with unknown direction', (d) => ({ ...d, debts: [{ ...d.debts[0], direction: 'gift' }] })],
    ['duplicate debt ids', (d) => ({ ...d, debts: [d.debts[0], d.debts[0]] })],
  ])('rejects %s', (_name, mutate) => {
    expect(parseWalletData(mutate(sampleData()))).toEqual({ ok: false, error: 'invalid_format' });
  });

  it('reports malformed JSON', () => {
    expect(parseWalletJson('{oops')).toEqual({ ok: false, error: 'not_json' });
  });
});

describe('migration from version 3', () => {
  it('adds an empty debt list', () => {
    const { debts: _debts, ...v3 } = sampleData();
    const result = parseWalletData({ ...v3, version: 3 });
    expect(result.ok && result.data).toEqual({ ...sampleData(), debts: [] });
  });
});

describe('migration from version 1', () => {
  it.each([
    ['without wallets', v1File()],
    ['with the empty wallets array a development build wrote', v1File({ wallets: [] })],
  ])('moves every transaction to one default wallet (%s)', (_name, file) => {
    const result = parseWalletData(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.version).toBe(CURRENT_VERSION);
    expect(result.data.wallets).toEqual([
      expect.objectContaining({ id: DEFAULT_WALLET_ID, name: MIGRATED_WALLET_NAME, isDefault: true, openingBalance: 0 }),
    ]);
    // The wallet is dated from the earliest transaction, not from when the migration ran.
    expect(result.data.wallets[0].createdAt).toBe('2026-09-25T02:00:00.000Z');
    expect(result.data.transactions.map((t) => t.walletId)).toEqual([DEFAULT_WALLET_ID, DEFAULT_WALLET_ID]);
    expect(result.data.budgets).toEqual([{ categoryId: 'exp-food', limit: 1_000_000 }]);
  });

  it('migrates version 1 backups', () => {
    const result = parseBackup(JSON.stringify({ app: BACKUP_APP_ID, exportedAt: now.toISOString(), ...v1File() }));
    expect(result.ok && result.data.transactions).toHaveLength(2);
  });

  it('still rejects invalid version 1 data', () => {
    const file = v1File();
    file.transactions[0].amount = -5;
    expect(parseWalletData(file)).toEqual({ ok: false, error: 'invalid_format' });
  });
});

describe('backup', () => {
  it('round-trips', () => {
    const text = serializeBackup(sampleData(), now);
    expect(JSON.parse(text)).toMatchObject({ app: BACKUP_APP_ID, exportedAt: now.toISOString() });
    expect(parseBackup(text)).toEqual({ ok: true, data: sampleData() });
  });

  it('rejects files that are not backups', () => {
    expect(parseBackup(JSON.stringify(sampleData()))).toEqual({ ok: false, error: 'not_a_backup' });
    expect(parseBackup('[]')).toEqual({ ok: false, error: 'not_a_backup' });
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'not_json' });
  });
});
