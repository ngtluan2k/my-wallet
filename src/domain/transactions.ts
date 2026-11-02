import { addDays, isValidLocalDate, monthOf } from './dates';
import { isValidAmount } from './money';
import type { Category, CategoryType, LocalDate, MonthKey, Transaction, TransactionType, Wallet } from './types';

export const MAX_NOTE_LENGTH = 500;

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  walletId: string;
  /** Required for transfers, ignored otherwise. */
  toWalletId?: string;
  /** Required for income/expense, ignored for transfers. */
  categoryId?: string;
  transactionDate: string;
  transactionTime?: string;
  note?: string;
}

export type TransactionError =
  | 'amount_invalid'
  | 'category_invalid'
  | 'category_type_mismatch'
  | 'wallet_invalid'
  | 'to_wallet_invalid'
  | 'transfer_same_wallet'
  | 'date_invalid'
  | 'time_invalid'
  | 'note_too_long';

export function isValidLocalTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h < 24 && m < 60;
}

/**
 * `existing` is the transaction being edited, if any: it may keep pointing at a wallet that has since
 * been archived, so editing old history still works.
 */
export function validateTransactionInput(
  input: TransactionInput,
  categories: Category[],
  wallets: Wallet[],
  existing?: Transaction,
): TransactionError[] {
  const errors: TransactionError[] = [];
  if (!isValidAmount(input.amount)) errors.push('amount_invalid');

  const usable = (id: string | undefined) =>
    wallets.some((w) => w.id === id && (!w.archived || id === existing?.walletId || id === existing?.toWalletId));
  if (!usable(input.walletId)) errors.push('wallet_invalid');

  if (input.type === 'transfer') {
    if (!usable(input.toWalletId)) errors.push('to_wallet_invalid');
    else if (input.toWalletId === input.walletId) errors.push('transfer_same_wallet');
  } else {
    const category = categories.find((c) => c.id === input.categoryId);
    if (!category) errors.push('category_invalid');
    else if (category.type !== input.type) errors.push('category_type_mismatch');
  }

  if (!isValidLocalDate(input.transactionDate)) errors.push('date_invalid');
  if (input.transactionTime && !isValidLocalTime(input.transactionTime)) errors.push('time_invalid');
  if ((input.note ?? '').length > MAX_NOTE_LENGTH) errors.push('note_too_long');
  return errors;
}

function normalizeNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}

/** Drops undefined keys so stored JSON stays minimal and stable. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** Keeps only the fields that belong to the input's type. */
function fieldsFromInput(input: TransactionInput) {
  const transfer = input.type === 'transfer';
  return {
    type: input.type,
    amount: input.amount,
    walletId: input.walletId,
    toWalletId: transfer ? input.toWalletId : undefined,
    categoryId: transfer ? undefined : input.categoryId,
    transactionDate: input.transactionDate,
    transactionTime: input.transactionTime || undefined,
    note: normalizeNote(input.note),
  };
}

export function createTransaction(input: TransactionInput, id: string, now: Date): Transaction {
  const timestamp = now.toISOString();
  return compact({ id, ...fieldsFromInput(input), createdAt: timestamp, updatedAt: timestamp });
}

export function updateTransaction(existing: Transaction, input: TransactionInput, now: Date): Transaction {
  return compact({ id: existing.id, ...fieldsFromInput(input), createdAt: existing.createdAt, updatedAt: now.toISOString() });
}

export interface TransactionFilter {
  month?: MonthKey;
  type?: TransactionType;
  categoryId?: string;
  /** Matches either side of a transfer. */
  walletId?: string;
}

export function filterTransactions(transactions: Transaction[], filter: TransactionFilter): Transaction[] {
  return transactions.filter(
    (t) =>
      (!filter.month || monthOf(t.transactionDate) === filter.month) &&
      (!filter.type || t.type === filter.type) &&
      (!filter.categoryId || t.categoryId === filter.categoryId) &&
      (!filter.walletId || t.walletId === filter.walletId || t.toWalletId === filter.walletId),
  );
}

/** Lowercases and strips Vietnamese diacritics so "an uong" finds "Ăn uống". */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase();
}

/** Matches the query against the note and the category's display name, ignoring case and accents. */
export function searchTransactions(
  transactions: Transaction[],
  query: string,
  categoryName: (categoryId: string | undefined) => string,
): Transaction[] {
  const q = foldText(query.trim());
  if (!q) return transactions;
  return transactions.filter((t) => foldText(`${t.note ?? ''} ${categoryName(t.categoryId)}`).includes(q));
}

/** Newest first: by date, then time (untimed entries last within a day), then creation time. */
export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) =>
      b.transactionDate.localeCompare(a.transactionDate) ||
      (b.transactionTime ?? '').localeCompare(a.transactionTime ?? '') ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export interface Summary {
  income: number;
  expense: number;
  /** income − expense over the given transactions. Transfers are excluded. */
  difference: number;
}

export function summarize(transactions: Transaction[]): Summary {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense, difference: income - expense };
}

export interface DayGroup {
  date: LocalDate;
  /** income − expense for the day; transfers don't count. */
  net: number;
  transactions: Transaction[];
}

/** Groups transactions by day, newest day first, each day sorted newest first. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups = new Map<LocalDate, Transaction[]>();
  for (const t of sortTransactions(transactions)) {
    const list = groups.get(t.transactionDate);
    if (list) list.push(t);
    else groups.set(t.transactionDate, [t]);
  }
  return [...groups].map(([date, txs]) => ({ date, net: summarize(txs).difference, transactions: txs }));
}

export type RelativeDay = 'today' | 'yesterday' | null;

export function relativeDay(date: LocalDate, todayDate: LocalDate): RelativeDay {
  if (date === todayDate) return 'today';
  if (date === addDays(todayDate, -1)) return 'yesterday';
  return null;
}

export interface CategoryTotal {
  categoryId: string;
  amount: number;
}

/** Totals per category for income or expense, largest first. */
export function totalsByCategory(transactions: Transaction[], type: CategoryType): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === type && t.categoryId) totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...totals].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount);
}
