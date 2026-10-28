import { isValidLocalDate, monthOf } from './dates';
import { isValidAmount } from './money';
import type { Category, MonthKey, Transaction, TransactionType } from './types';

export const MAX_NOTE_LENGTH = 500;

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string;
  transactionDate: string;
  note?: string;
}

export type TransactionError =
  | 'amount_invalid'
  | 'category_invalid'
  | 'category_type_mismatch'
  | 'date_invalid'
  | 'note_too_long';

export function validateTransactionInput(input: TransactionInput, categories: Category[]): TransactionError[] {
  const errors: TransactionError[] = [];
  if (!isValidAmount(input.amount)) errors.push('amount_invalid');
  const category = categories.find((c) => c.id === input.categoryId);
  if (!category) errors.push('category_invalid');
  else if (category.type !== input.type) errors.push('category_type_mismatch');
  if (!isValidLocalDate(input.transactionDate)) errors.push('date_invalid');
  if ((input.note ?? '').length > MAX_NOTE_LENGTH) errors.push('note_too_long');
  return errors;
}

function normalizeNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}

export function createTransaction(input: TransactionInput, id: string, now: Date): Transaction {
  const timestamp = now.toISOString();
  return {
    id,
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    transactionDate: input.transactionDate,
    note: normalizeNote(input.note),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTransaction(existing: Transaction, input: TransactionInput, now: Date): Transaction {
  return {
    ...existing,
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    transactionDate: input.transactionDate,
    note: normalizeNote(input.note),
    updatedAt: now.toISOString(),
  };
}

export interface TransactionFilter {
  month?: MonthKey;
  type?: TransactionType;
  categoryId?: string;
  /** Case-insensitive match against the note. */
  search?: string;
}

export function filterTransactions(transactions: Transaction[], filter: TransactionFilter): Transaction[] {
  const search = filter.search?.trim().toLocaleLowerCase();
  return transactions.filter(
    (t) =>
      (!filter.month || monthOf(t.transactionDate) === filter.month) &&
      (!filter.type || t.type === filter.type) &&
      (!filter.categoryId || t.categoryId === filter.categoryId) &&
      (!search || (t.note ?? '').toLocaleLowerCase().includes(search)),
  );
}

/** Newest first: by transaction date, then by creation time. */
export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt),
  );
}

export interface Summary {
  income: number;
  expense: number;
  /** income − expense. Not an account balance: the MVP doesn't track opening balances. */
  difference: number;
}

export function summarize(transactions: Transaction[]): Summary {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, difference: income - expense };
}

export interface CategoryTotal {
  categoryId: string;
  amount: number;
}

/** Totals per category for one transaction type, largest first. */
export function totalsByCategory(transactions: Transaction[], type: TransactionType): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === type) totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...totals].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount);
}
