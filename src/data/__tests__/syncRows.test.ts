import type { Debt } from '@/domain/types';

import { fromRow, toRow } from '../syncRows';

const base: Debt = {
  id: 'd1',
  direction: 'borrowed',
  person: 'Minh',
  amount: 1_500_000,
  walletId: 'wallet-default',
  date: '2026-11-01',
  createdAt: '2026-11-01T03:00:00.000Z',
  updatedAt: '2026-11-02T03:00:00.000Z',
};

/** What PostgREST returns: bigint may come back as a string, timestamps with "+00:00". */
function asServerRow(debt: Debt) {
  const row = toRow('debts', debt);
  return {
    ...row,
    amount: String(row.amount),
    created_at: '2026-11-01T03:00:00+00:00',
    updated_at: '2026-11-02T03:00:00+00:00',
    server_updated_at: '2026-11-02T03:00:01+00:00',
  };
}

describe('debt rows', () => {
  it.each<[string, Debt]>([
    ['open', base],
    ['settled with a note', { ...base, note: 'Học phí', settledDate: '2026-11-03', settleWalletId: 'bank' }],
  ])('round-trips an %s debt', (_name, debt) => {
    expect(fromRow('debts', asServerRow(debt))).toEqual({ table: 'debts', id: debt.id, record: debt });
  });

  it('maps a soft-deleted row to a deletion', () => {
    expect(fromRow('debts', { ...asServerRow(base), deleted_at: '2026-11-03T00:00:00+00:00' })).toEqual({ table: 'debts', id: 'd1' });
  });
});
