import {
  createDebt,
  debtBalanceEffect,
  debtTotals,
  reopenDebt,
  settleDebt,
  sortDebts,
  updateDebt,
  validateDebtInput,
  validateSettlement,
  type DebtInput,
} from '../debts';
import type { Debt, Wallet } from '../types';
import { createDefaultWallet, DEFAULT_WALLET_ID } from '../wallets';

const now = new Date('2026-11-03T03:00:00.000Z');
const later = new Date('2026-11-04T03:00:00.000Z');
const cash = createDefaultWallet('Ví chính', now);
const bank: Wallet = { ...cash, id: 'bank', name: 'Ngân hàng', kind: 'bank', isDefault: false };
const oldWallet: Wallet = { ...cash, id: 'old', name: 'Cũ', isDefault: false, archived: true };
const wallets = [cash, bank, oldWallet];

const input: DebtInput = { direction: 'lent', person: '  Minh ', amount: 500_000, walletId: DEFAULT_WALLET_ID, date: '2026-11-01', note: ' ' };

describe('validateDebtInput', () => {
  it('accepts a valid debt', () => {
    expect(validateDebtInput(input, wallets)).toEqual([]);
  });

  it.each<[string, Partial<DebtInput>, string]>([
    ['empty person', { person: '   ' }, 'person_required'],
    ['long person', { person: 'x'.repeat(61) }, 'person_too_long'],
    ['zero amount', { amount: 0 }, 'amount_invalid'],
    ['float amount', { amount: 1.5 }, 'amount_invalid'],
    ['unknown wallet', { walletId: 'nope' }, 'wallet_invalid'],
    ['archived wallet', { walletId: 'old' }, 'wallet_invalid'],
    ['bad date', { date: '2026-13-01' }, 'date_invalid'],
    ['long note', { note: 'x'.repeat(501) }, 'note_too_long'],
  ])('rejects %s', (_name, change, error) => {
    expect(validateDebtInput({ ...input, ...change }, wallets)).toContain(error);
  });

  it('lets an existing debt keep its archived wallet', () => {
    const existing = createDebt({ ...input, walletId: 'old' }, 'd1', now);
    expect(validateDebtInput({ ...input, walletId: 'old' }, wallets, existing)).toEqual([]);
  });

  it('rejects moving a settled debt after its settlement date', () => {
    const settled = settleDebt(createDebt(input, 'd1', now), '2026-11-02', 'bank', now);
    expect(validateDebtInput({ ...input, date: '2026-11-03' }, wallets, settled)).toEqual(['date_invalid']);
  });
});

describe('debt lifecycle', () => {
  it('trims fields and drops an empty note', () => {
    expect(createDebt(input, 'd1', now)).toEqual({
      id: 'd1',
      direction: 'lent',
      person: 'Minh',
      amount: 500_000,
      walletId: DEFAULT_WALLET_ID,
      date: '2026-11-01',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('settles, keeps the settlement on edit, and reopens', () => {
    const debt = createDebt(input, 'd1', now);
    expect(validateSettlement(debt, '2026-10-31', 'bank', wallets)).toEqual(['settle_date_invalid']);
    expect(validateSettlement(debt, '2026-11-02', 'old', wallets)).toEqual(['settle_wallet_invalid']);
    expect(validateSettlement(debt, '2026-11-01', 'bank', wallets)).toEqual([]);

    const settled = settleDebt(debt, '2026-11-02', 'bank', later);
    expect(settled).toMatchObject({ settledDate: '2026-11-02', settleWalletId: 'bank', updatedAt: later.toISOString() });

    const edited = updateDebt(settled, { ...input, amount: 600_000, note: 'Học phí' }, later);
    expect(edited).toMatchObject({ amount: 600_000, note: 'Học phí', settledDate: '2026-11-02', createdAt: now.toISOString() });

    const reopened = reopenDebt(edited, later);
    expect(reopened.settledDate).toBeUndefined();
    expect('settleWalletId' in reopened).toBe(false);
  });
});

describe('totals, order and balance effect', () => {
  const lent = createDebt(input, 'a', now);
  const borrowed = createDebt({ ...input, direction: 'borrowed', amount: 2_000_000, date: '2026-10-20' }, 'b', now);
  const paid = settleDebt(createDebt({ ...input, amount: 100_000 }, 'c', now), '2026-11-02', DEFAULT_WALLET_ID, now);

  it('sums only open debts per direction', () => {
    expect(debtTotals([lent, borrowed, paid])).toEqual({ owedToMe: 500_000, iOwe: 2_000_000 });
  });

  it('lists open debts oldest first, then settled ones', () => {
    expect(sortDebts([paid, lent, borrowed]).map((d: Debt) => d.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves money out when lending and in when borrowing, reversed on settlement', () => {
    expect(debtBalanceEffect(lent, DEFAULT_WALLET_ID)).toBe(-500_000);
    expect(debtBalanceEffect(borrowed, DEFAULT_WALLET_ID)).toBe(2_000_000);
    expect(debtBalanceEffect(paid, DEFAULT_WALLET_ID)).toBe(0);
    const repaidElsewhere = settleDebt(borrowed, '2026-11-02', 'bank', now);
    expect(debtBalanceEffect(repaidElsewhere, DEFAULT_WALLET_ID)).toBe(2_000_000);
    expect(debtBalanceEffect(repaidElsewhere, 'bank')).toBe(-2_000_000);
  });
});
