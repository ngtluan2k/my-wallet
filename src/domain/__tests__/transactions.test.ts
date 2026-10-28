import { DEFAULT_CATEGORIES } from '../categories';
import {
  createTransaction,
  filterTransactions,
  sortTransactions,
  summarize,
  totalsByCategory,
  updateTransaction,
  validateTransactionInput,
  type TransactionInput,
} from '../transactions';
import type { Transaction } from '../types';

const now = new Date('2026-10-28T03:00:00.000Z');

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'id',
    type: 'expense',
    amount: 1000,
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
  categoryId: 'exp-food',
  transactionDate: '2026-10-28',
  note: '  Phở  ',
};

describe('validateTransactionInput', () => {
  it('accepts valid input', () => {
    expect(validateTransactionInput(validInput, DEFAULT_CATEGORIES)).toEqual([]);
  });

  it('reports each problem', () => {
    expect(
      validateTransactionInput(
        { type: 'income', amount: 0, categoryId: 'exp-food', transactionDate: '2026-02-30', note: 'x'.repeat(501) },
        DEFAULT_CATEGORIES,
      ),
    ).toEqual(['amount_invalid', 'category_type_mismatch', 'date_invalid', 'note_too_long']);
    expect(validateTransactionInput({ ...validInput, categoryId: 'missing' }, DEFAULT_CATEGORIES)).toEqual([
      'category_invalid',
    ]);
    expect(validateTransactionInput({ ...validInput, amount: 10.5 }, DEFAULT_CATEGORIES)).toEqual(['amount_invalid']);
  });
});

describe('create/update', () => {
  it('trims notes and stamps times', () => {
    const created = createTransaction(validInput, 'a', now);
    expect(created).toMatchObject({ id: 'a', note: 'Phở', createdAt: now.toISOString(), updatedAt: now.toISOString() });

    const later = new Date('2026-10-29T00:00:00.000Z');
    const updated = updateTransaction(created, { ...validInput, amount: 60000, note: '   ' }, later);
    expect(updated).toMatchObject({ id: 'a', amount: 60000, note: undefined, createdAt: now.toISOString() });
    expect(updated.updatedAt).toBe(later.toISOString());
  });
});

describe('queries', () => {
  const list = [
    tx({ id: '1', type: 'income', amount: 10_000_000, categoryId: 'inc-salary', transactionDate: '2026-10-05' }),
    tx({ id: '2', amount: 120_000, categoryId: 'exp-food', transactionDate: '2026-10-06', note: 'Cơm trưa' }),
    tx({ id: '3', amount: 80_000, categoryId: 'exp-food', transactionDate: '2026-10-07' }),
    tx({ id: '4', amount: 500_000, categoryId: 'exp-transport', transactionDate: '2026-10-07' }),
    tx({ id: '5', amount: 999, categoryId: 'exp-food', transactionDate: '2026-09-30' }),
  ];

  it('filters by month, type, category and note', () => {
    expect(filterTransactions(list, { month: '2026-10' }).map((t) => t.id)).toEqual(['1', '2', '3', '4']);
    expect(filterTransactions(list, { type: 'income' }).map((t) => t.id)).toEqual(['1']);
    expect(filterTransactions(list, { month: '2026-10', categoryId: 'exp-food' }).map((t) => t.id)).toEqual(['2', '3']);
    expect(filterTransactions(list, { search: 'CƠM' }).map((t) => t.id)).toEqual(['2']);
  });

  it('summarizes income, expense and difference', () => {
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

  it('sorts newest first, breaking ties by creation time', () => {
    const sorted = sortTransactions([
      tx({ id: 'old', transactionDate: '2026-10-01' }),
      tx({ id: 'b', transactionDate: '2026-10-02', createdAt: '2026-10-02T01:00:00.000Z' }),
      tx({ id: 'c', transactionDate: '2026-10-02', createdAt: '2026-10-02T02:00:00.000Z' }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['c', 'b', 'old']);
  });
});
