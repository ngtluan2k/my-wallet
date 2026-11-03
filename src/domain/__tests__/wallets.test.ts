import type { Debt, Transaction } from '../types';
import {
  addWallet,
  archiveWallet,
  createDefaultWallet,
  defaultWalletId,
  deleteWallet,
  editWallet,
  totalBalance,
  unarchiveWallet,
  validateWalletInput,
  walletBalance,
  walletInUse,
  type WalletInput,
} from '../wallets';

const now = new Date('2026-10-28T03:00:00.000Z');
const cash = { ...createDefaultWallet('Ví chính', now), openingBalance: 1_000_000 };
const input: WalletInput = { name: 'Techcombank', kind: 'bank', color: '#0EA5E9', openingBalance: 5_000_000, isDefault: false };

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(),
    type: 'expense',
    amount: 1,
    walletId: cash.id,
    categoryId: 'exp-food',
    transactionDate: '2026-10-01',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

describe('wallets', () => {
  it('validates names and opening balances', () => {
    expect(validateWalletInput(input, [cash])).toEqual([]);
    expect(validateWalletInput({ ...input, name: '  ' }, [cash])).toEqual(['name_required']);
    expect(validateWalletInput({ ...input, name: 'ví CHÍNH' }, [cash])).toEqual(['name_taken']);
    expect(validateWalletInput({ ...input, name: 'Ví chính' }, [cash], cash.id)).toEqual([]);
    expect(validateWalletInput({ ...input, openingBalance: -1 }, [cash])).toEqual(['balance_invalid']);
    expect(validateWalletInput({ ...input, openingBalance: 0 }, [cash])).toEqual([]);
  });

  it('keeps exactly one default wallet', () => {
    const added = addWallet([cash], { ...input, isDefault: true }, 'bank', now);
    expect(added.filter((w) => w.isDefault).map((w) => w.id)).toEqual(['bank']);
    expect(defaultWalletId(added)).toBe('bank');

    const edited = editWallet(added, cash.id, { ...input, name: 'Tiền mặt', kind: 'cash', isDefault: true }, now);
    expect(edited.filter((w) => w.isDefault).map((w) => w.id)).toEqual([cash.id]);

    const archived = archiveWallet(edited, cash.id, now);
    expect(archived.find((w) => w.id === cash.id)).toMatchObject({ archived: true, isDefault: false });
    expect(defaultWalletId(archived)).toBe('bank');
  });

  it('never archives or deletes the last active wallet', () => {
    expect(() => archiveWallet([cash], cash.id, now)).toThrow('last_wallet');
    expect(() => deleteWallet([cash], [], [], cash.id, now)).toThrow('last_wallet');
  });

  it('only deletes unused wallets', () => {
    const wallets = addWallet([cash], input, 'bank', now);
    expect(() => deleteWallet(wallets, [tx({ walletId: 'bank' })], [], 'bank', now)).toThrow('wallet_in_use');
    expect(deleteWallet(wallets, [], [], 'bank', now).map((w) => w.id)).toEqual([cash.id]);
  });

  it('computes balances from opening balance, flows and transfers', () => {
    const bank = addWallet([cash], input, 'bank', now)[1];
    const txs = [
      tx({ type: 'income', amount: 300_000, categoryId: 'inc-salary' }),
      tx({ type: 'expense', amount: 100_000 }),
      tx({ type: 'transfer', amount: 200_000, categoryId: undefined, toWalletId: 'bank' }),
      tx({ type: 'expense', amount: 50_000, walletId: 'bank' }),
    ];
    expect(walletBalance(cash, txs, [])).toBe(1_000_000 + 300_000 - 100_000 - 200_000);
    expect(walletBalance(bank, txs, [])).toBe(5_000_000 + 200_000 - 50_000);
    // Transfers move money between wallets without changing the total.
    expect(totalBalance([cash, bank], txs, [])).toBe(6_000_000 + 300_000 - 100_000 - 50_000);
    expect(totalBalance([cash, { ...bank, archived: true }], txs, [])).toBe(1_000_000);
  });

  it('applies open and settled debts to wallet balances', () => {
    const bank = addWallet([cash], input, 'bank', now)[1];
    const base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), person: 'An', date: '2026-11-01' };
    const lent: Debt = { ...base, id: 'd1', direction: 'lent', amount: 500_000, walletId: cash.id };
    const borrowed: Debt = { ...base, id: 'd2', direction: 'borrowed', amount: 2_000_000, walletId: 'bank' };
    expect(walletBalance(cash, [], [lent])).toBe(1_000_000 - 500_000);
    expect(walletBalance(bank, [], [borrowed])).toBe(5_000_000 + 2_000_000);
    // Paid back into another wallet: cash stays down, bank goes up.
    const settled = { ...lent, settledDate: '2026-11-03', settleWalletId: 'bank' };
    expect(walletBalance(cash, [], [settled])).toBe(500_000);
    expect(walletBalance(bank, [], [settled])).toBe(5_500_000);
    expect(totalBalance([cash, bank], [], [settled])).toBe(6_000_000);
  });

  it('treats a wallet used by a debt as in use', () => {
    const wallets = addWallet([cash], input, 'bank', now);
    const debt: Debt = {
      id: 'd1', direction: 'lent', person: 'An', amount: 1, walletId: cash.id, date: '2026-11-01',
      settledDate: '2026-11-02', settleWalletId: 'bank', createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };
    expect(walletInUse([], [debt], 'bank')).toBe(true);
    expect(() => deleteWallet(wallets, [], [debt], 'bank', now)).toThrow('wallet_in_use');
  });
});

describe('unarchiveWallet', () => {
  it('restores an archived wallet without changing the default', () => {
    const wallets = addWallet([cash], input, 'bank', now);
    const archived = archiveWallet(wallets, 'bank', now);
    const restored = unarchiveWallet(archived, 'bank', now);
    expect(restored.find((w) => w.id === 'bank')).toMatchObject({ archived: false, isDefault: false });
    expect(defaultWalletId(restored)).toBe(cash.id);
    expect(unarchiveWallet(wallets, cash.id, now)).toEqual(wallets);
  });
});
