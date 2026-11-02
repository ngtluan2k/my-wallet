import { DEFAULT_CATEGORIES } from '../categories';
import {
  createTransaction,
  filterTransactions,
  foldText,
  groupByDay,
  relativeDay,
  searchTransactions,
  sortTransactions,
  summarize,
  totalsByCategory,
  updateTransaction,
  validateTransactionInput,
  type TransactionInput,
} from '../transactions';
import type { Transaction, Wallet } from '../types';
import { createDefaultWallet } from '../wallets';

const now = new Date('2026-10-28T03:00:00.000Z');

const cash = createDefaultWallet('Ví chính', now);
const bank: Wallet = { ...cash, id: 'bank', name: 'Ngân hàng', kind: 'bank', isDefault: false };
const old: Wallet = { ...cash, id: 'old', name: 'Cũ', isDefault: false, archived: true };
const wallets = [cash, bank, old];

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'id',
    type: 'expense',
    amount: 1000,
    walletId: cash.id,
    categoryId: 'exp-food',
    transactionDate: '2026-10-01',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

const validInput: TransactionInput = {
  type: 'expense',
  amount: 50000,
  walletId: cash.id,
  categoryId: 'exp-food',
  transactionDate: '2026-10-28',
  transactionTime: '12:30',
  note: '  Phở  ',
};

const transferInput: TransactionInput = {
  type: 'transfer',
  amount: 200000,
  walletId: cash.id,
  toWalletId: bank.id,
  categoryId: 'exp-food',
  transactionDate: '2026-10-28',
};

describe('validateTransactionInput', () => {
  it('accepts valid income/expense and transfer input', () => {
    expect(validateTransactionInput(validInput, DEFAULT_CATEGORIES, wallets)).toEqual([]);
    expect(validateTransactionInput(transferInput, DEFAULT_CATEGORIES, wallets)).toEqual([]);
  });

  it('reports each problem', () => {
    expect(
      validateTransactionInput(
        {
          type: 'income',
          amount: 0,
          walletId: 'missing',
          categoryId: 'exp-food',
          transactionDate: '2026-02-30',
          transactionTime: '25:00',
          note: 'x'.repeat(501),
        },
        DEFAULT_CATEGORIES,
        wallets,
      ),
    ).toEqual(['amount_invalid', 'wallet_invalid', 'category_type_mismatch', 'date_invalid', 'time_invalid', 'note_too_long']);
    expect(validateTransactionInput({ ...validInput, categoryId: 'missing' }, DEFAULT_CATEGORIES, wallets)).toEqual([
      'category_invalid',
    ]);
    expect(validateTransactionInput({ ...validInput, amount: 10.5 }, DEFAULT_CATEGORIES, wallets)).toEqual(['amount_invalid']);
  });

  it('checks transfer wallets', () => {
    expect(validateTransactionInput({ ...transferInput, toWalletId: cash.id }, DEFAULT_CATEGORIES, wallets)).toEqual([
      'transfer_same_wallet',
    ]);
    expect(validateTransactionInput({ ...transferInput, toWalletId: undefined }, DEFAULT_CATEGORIES, wallets)).toEqual([
      'to_wallet_invalid',
    ]);
  });

  it('rejects archived wallets for new entries but allows them when editing old ones', () => {
    const input = { ...validInput, walletId: old.id };
    expect(validateTransactionInput(input, DEFAULT_CATEGORIES, wallets)).toEqual(['wallet_invalid']);
    expect(validateTransactionInput(input, DEFAULT_CATEGORIES, wallets, tx({ walletId: old.id }))).toEqual([]);
  });
});

describe('create/update', () => {
  it('trims notes, stamps times and keeps only fields for the type', () => {
    const created = createTransaction(validInput, 'a', now);
    expect(created).toEqual({
      id: 'a',
      type: 'expense',
      amount: 50000,
      walletId: cash.id,
      categoryId: 'exp-food',
      transactionDate: '2026-10-28',
      transactionTime: '12:30',
      note: 'Phở',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    const later = new Date('2026-10-29T00:00:00.000Z');
    const updated = updateTransaction(created, { ...validInput, amount: 60000, note: '   ', transactionTime: '' }, later);
    expect(updated).toMatchObject({ id: 'a', amount: 60000, createdAt: now.toISOString(), updatedAt: later.toISOString() });
    expect('note' in updated).toBe(false);
    expect('transactionTime' in updated).toBe(false);
  });

  it('drops the category from transfers', () => {
    const transfer = createTransaction(transferInput, 't', now);
    expect(transfer.categoryId).toBeUndefined();
    expect(transfer.toWalletId).toBe(bank.id);
  });
});

describe('queries', () => {
  const list = [
    tx({ id: '1', type: 'income', amount: 10_000_000, categoryId: 'inc-salary', transactionDate: '2026-10-05' }),
    tx({ id: '2', amount: 120_000, categoryId: 'exp-food', transactionDate: '2026-10-06', note: 'Cơm trưa' }),
    tx({ id: '3', amount: 80_000, categoryId: 'exp-food', transactionDate: '2026-10-07' }),
    tx({ id: '4', amount: 500_000, categoryId: 'exp-transport', transactionDate: '2026-10-07', walletId: bank.id }),
    tx({ id: '5', amount: 999, categoryId: 'exp-food', transactionDate: '2026-09-30' }),
    tx({ id: '6', type: 'transfer', amount: 1_000_000, categoryId: undefined, toWalletId: bank.id, transactionDate: '2026-10-07' }),
  ];

  it('filters by month, type, category and wallet', () => {
    expect(filterTransactions(list, { month: '2026-10' }).map((t) => t.id)).toEqual(['1', '2', '3', '4', '6']);
    expect(filterTransactions(list, { type: 'income' }).map((t) => t.id)).toEqual(['1']);
    expect(filterTransactions(list, { month: '2026-10', categoryId: 'exp-food' }).map((t) => t.id)).toEqual(['2', '3']);
    expect(filterTransactions(list, { walletId: bank.id }).map((t) => t.id)).toEqual(['4', '6']);
  });

  it('searches notes and category names without accents', () => {
    const names: Record<string, string> = { 'exp-food': 'Ăn uống', 'exp-transport': 'Di chuyển' };
    const name = (id: string | undefined) => (id ? names[id] ?? '' : '');
    expect(searchTransactions(list, 'COM', name).map((t) => t.id)).toEqual(['2']);
    expect(searchTransactions(list, 'di chuyen', name).map((t) => t.id)).toEqual(['4']);
    expect(searchTransactions(list, '  ', name)).toHaveLength(list.length);
    expect(foldText('Đường Ăn')).toBe('duong an');
  });

  it('summarizes income and expense, ignoring transfers', () => {
    expect(summarize(filterTransactions(list, { month: '2026-10' }))).toEqual({
      income: 10_000_000,
      expense: 700_000,
      difference: 9_300_000,
    });
    expect(summarize([])).toEqual({ income: 0, expense: 0, difference: 0 });
  });

  it('totals expenses by category, largest first', () => {
    expect(totalsByCategory(filterTransactions(list, { month: '2026-10' }), 'expense')).toEqual([
      { categoryId: 'exp-transport', amount: 500_000 },
      { categoryId: 'exp-food', amount: 200_000 },
    ]);
  });

  it('sorts newest first by date, then time, then creation time', () => {
    const sorted = sortTransactions([
      tx({ id: 'old', transactionDate: '2026-10-01' }),
      tx({ id: 'b', transactionDate: '2026-10-02', createdAt: '2026-10-02T01:00:00.000Z' }),
      tx({ id: 'c', transactionDate: '2026-10-02', createdAt: '2026-10-02T02:00:00.000Z' }),
      tx({ id: 'morning', transactionDate: '2026-10-02', transactionTime: '08:00' }),
      tx({ id: 'evening', transactionDate: '2026-10-02', transactionTime: '19:30' }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['evening', 'morning', 'c', 'b', 'old']);
  });

  it('groups by day with the day net', () => {
    const groups = groupByDay(filterTransactions(list, { month: '2026-10' }));
    expect(groups.map((g) => [g.date, g.net, g.transactions.length])).toEqual([
      ['2026-10-07', -580_000, 3],
      ['2026-10-06', -120_000, 1],
      ['2026-10-05', 10_000_000, 1],
    ]);
  });

  it('labels today and yesterday', () => {
    expect(relativeDay('2026-10-28', '2026-10-28')).toBe('today');
    expect(relativeDay('2026-10-27', '2026-10-28')).toBe('yesterday');
    expect(relativeDay('2026-09-30', '2026-10-01')).toBe('yesterday');
    expect(relativeDay('2026-10-20', '2026-10-28')).toBeNull();
  });
});
