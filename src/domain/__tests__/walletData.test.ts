import { createTransaction } from '../transactions';
import {
  BACKUP_APP_ID,
  CURRENT_VERSION,
  createInitialData,
  parseBackup,
  parseWalletData,
  parseWalletJson,
  serializeBackup,
} from '../walletData';
import type { WalletData } from '../types';

const now = new Date('2026-10-28T03:00:00.000Z');

function sampleData(): WalletData {
  const data = createInitialData();
  return {
    ...data,
    transactions: [
      createTransaction(
        { type: 'expense', amount: 45000, categoryId: 'exp-food', transactionDate: '2026-10-28', note: 'Bún chả' },
        't1',
        now,
      ),
    ],
    budgets: [{ categoryId: 'exp-food', limit: 3_000_000 }],
  };
}

describe('parseWalletData', () => {
  it('accepts initial and populated data', () => {
    expect(parseWalletData(createInitialData())).toEqual({ ok: true, data: createInitialData() });
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
    ['unknown category', (d) => ({ ...d, transactions: [{ ...d.transactions[0], categoryId: 'nope' }] })],
    ['type mismatch', (d) => ({ ...d, transactions: [{ ...d.transactions[0], type: 'income' }] })],
    ['duplicate ids', (d) => ({ ...d, transactions: [d.transactions[0], d.transactions[0]] })],
    ['budget on income category', (d) => ({ ...d, budgets: [{ categoryId: 'inc-salary', limit: 1 }] })],
    ['not an array', (d) => ({ ...d, categories: {} })],
  ])('rejects %s', (_name, mutate) => {
    expect(parseWalletData(mutate(sampleData()))).toEqual({ ok: false, error: 'invalid_format' });
  });

  it('reports malformed JSON', () => {
    expect(parseWalletJson('{oops')).toEqual({ ok: false, error: 'not_json' });
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
