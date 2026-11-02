import { addDays, addMonths, daysInMonth, isValidLocalDate, monthOf } from './dates';
import { createTransaction, validateTransactionInput, type TransactionError, type TransactionInput } from './transactions';
import type { LocalDate, RecurringFrequency, RecurringRule, Transaction, WalletData } from './types';

/** Upper bound of occurrences created in one run, so a rule started long ago can't stall the app. */
export const MAX_CATCH_UP = 366;

export interface RecurringInput {
  type: RecurringRule['type'];
  amount: number;
  walletId: string;
  categoryId: string;
  note?: string;
  frequency: RecurringFrequency;
  startDate: LocalDate;
}

export function occurrenceId(ruleId: string, date: LocalDate): string {
  return `${ruleId}@${date}`;
}

/** The occurrence after `date` for a rule starting on `startDate`. */
export function nextOccurrence(frequency: RecurringFrequency, startDate: LocalDate, date: LocalDate): LocalDate {
  if (frequency === 'weekly') return addDays(date, 7);
  const month = addMonths(monthOf(date), 1);
  const day = Math.min(Number(startDate.slice(8, 10)), daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

function transactionInput(rule: Pick<RecurringRule, 'type' | 'amount' | 'walletId' | 'categoryId' | 'note'>, date: LocalDate): TransactionInput {
  return { type: rule.type, amount: rule.amount, walletId: rule.walletId, categoryId: rule.categoryId, note: rule.note, transactionDate: date };
}

/** Same checks as a one-off transaction on the start date. */
export function validateRecurringInput(input: RecurringInput, data: Pick<WalletData, 'categories' | 'wallets'>): TransactionError[] {
  const errors = validateTransactionInput(transactionInput(input, input.startDate), data.categories, data.wallets);
  if (!isValidLocalDate(input.startDate) && !errors.includes('date_invalid')) errors.push('date_invalid');
  return errors;
}

function fields(input: RecurringInput) {
  const note = input.note?.trim();
  return {
    type: input.type,
    amount: input.amount,
    walletId: input.walletId,
    categoryId: input.categoryId,
    ...(note ? { note } : {}),
    frequency: input.frequency,
    startDate: input.startDate,
  };
}

export function createRecurringRule(input: RecurringInput, id: string, now: Date): RecurringRule {
  const timestamp = now.toISOString();
  return { id, ...fields(input), nextDate: input.startDate, createdAt: timestamp, updatedAt: timestamp };
}

/**
 * Editing keeps the occurrences already created. Changing the schedule restarts it from the new
 * start date, but never re-creates a date that already has its transaction.
 */
export function updateRecurringRule(rule: RecurringRule, input: RecurringInput, now: Date): RecurringRule {
  const scheduleChanged = rule.frequency !== input.frequency || rule.startDate !== input.startDate;
  const { paused, ...rest } = rule;
  return {
    ...rest,
    ...fields(input),
    ...(paused ? { paused } : {}),
    nextDate: scheduleChanged ? input.startDate : rule.nextDate,
    updatedAt: now.toISOString(),
  };
}

/**
 * Creates every occurrence due up to `today` and advances each rule. Occurrences whose id already
 * exists (created on another device, or deleted and re-synced) are not duplicated. A rule whose
 * wallet or category can no longer be used is paused instead of skipping dates silently.
 * Returns the same object when nothing was due.
 */
export function generateDueTransactions(data: WalletData, today: LocalDate, now: Date): WalletData {
  const existingIds = new Set(data.transactions.map((t) => t.id));
  const created: Transaction[] = [];
  let changed = false;

  const recurring = data.recurring.map((rule) => {
    if (rule.paused || rule.nextDate > today) return rule;
    let next = rule.nextDate;
    let paused = false;
    for (let i = 0; i < MAX_CATCH_UP && next <= today; i++) {
      const input = transactionInput(rule, next);
      if (validateTransactionInput(input, data.categories, data.wallets).length) {
        paused = true;
        break;
      }
      const id = occurrenceId(rule.id, next);
      if (!existingIds.has(id)) {
        created.push(createTransaction(input, id, now));
        existingIds.add(id);
      }
      next = nextOccurrence(rule.frequency, rule.startDate, next);
    }
    changed = true;
    return { ...rule, nextDate: next, ...(paused ? { paused: true } : {}), updatedAt: now.toISOString() };
  });

  if (!changed) return data;
  return { ...data, transactions: [...data.transactions, ...created], recurring };
}

export function ruleUsesWallet(rules: RecurringRule[], walletId: string): boolean {
  return rules.some((r) => r.walletId === walletId);
}

export function ruleUsesCategory(rules: RecurringRule[], categoryId: string): boolean {
  return rules.some((r) => r.categoryId === categoryId);
}

/** True for transactions created automatically by a recurring rule. */
export function isRecurringOccurrence(transactionId: string): boolean {
  return transactionId.includes('@');
}
