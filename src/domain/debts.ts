import { isValidLocalDate } from './dates';
import { isValidAmount } from './money';
import { MAX_NOTE_LENGTH } from './transactions';
import type { Debt, DebtDirection, LocalDate, Wallet } from './types';

export const MAX_PERSON_LENGTH = 60;

export interface DebtInput {
  direction: DebtDirection;
  person: string;
  amount: number;
  walletId: string;
  date: LocalDate;
  note?: string;
}

export type DebtError =
  | 'person_required'
  | 'person_too_long'
  | 'amount_invalid'
  | 'wallet_invalid'
  | 'date_invalid'
  | 'note_too_long'
  | 'settle_date_invalid'
  | 'settle_wallet_invalid';

/** A wallet can be picked if it is active, or if `keepId` already points at it (editing old data). */
function usableWallet(wallets: Wallet[], id: string, keepId?: string): boolean {
  const wallet = wallets.find((w) => w.id === id);
  return !!wallet && (!wallet.archived || id === keepId);
}

/**
 * `existing` is the debt being edited, if any: it may keep its archived wallet. A settled debt can't
 * get a date after its settlement date.
 */
export function validateDebtInput(input: DebtInput, wallets: Wallet[], existing?: Debt): DebtError[] {
  const errors: DebtError[] = [];
  const person = input.person.trim();
  if (!person) errors.push('person_required');
  else if (person.length > MAX_PERSON_LENGTH) errors.push('person_too_long');
  if (!isValidAmount(input.amount)) errors.push('amount_invalid');
  if (!usableWallet(wallets, input.walletId, existing?.walletId)) errors.push('wallet_invalid');
  if (!isValidLocalDate(input.date) || (existing?.settledDate !== undefined && input.date > existing.settledDate)) {
    errors.push('date_invalid');
  }
  if ((input.note?.trim().length ?? 0) > MAX_NOTE_LENGTH) errors.push('note_too_long');
  return errors;
}

export function validateSettlement(debt: Debt, date: LocalDate, walletId: string, wallets: Wallet[]): DebtError[] {
  const errors: DebtError[] = [];
  if (!isValidLocalDate(date) || date < debt.date) errors.push('settle_date_invalid');
  if (!usableWallet(wallets, walletId, debt.settleWalletId)) errors.push('settle_wallet_invalid');
  return errors;
}

function fields(input: DebtInput) {
  const note = input.note?.trim();
  return {
    direction: input.direction,
    person: input.person.trim(),
    amount: input.amount,
    walletId: input.walletId,
    date: input.date,
    ...(note ? { note } : {}),
  };
}

export function createDebt(input: DebtInput, id: string, now: Date): Debt {
  const timestamp = now.toISOString();
  return { id, ...fields(input), createdAt: timestamp, updatedAt: timestamp };
}

/** Keeps the settlement, if any. */
export function updateDebt(debt: Debt, input: DebtInput, now: Date): Debt {
  return {
    id: debt.id,
    ...fields(input),
    ...(debt.settledDate !== undefined ? { settledDate: debt.settledDate, settleWalletId: debt.settleWalletId } : {}),
    createdAt: debt.createdAt,
    updatedAt: now.toISOString(),
  };
}

export function settleDebt(debt: Debt, date: LocalDate, walletId: string, now: Date): Debt {
  return { ...debt, settledDate: date, settleWalletId: walletId, updatedAt: now.toISOString() };
}

export function reopenDebt(debt: Debt, now: Date): Debt {
  const { settledDate: _date, settleWalletId: _wallet, ...rest } = debt;
  return { ...rest, updatedAt: now.toISOString() };
}

export const isSettled = (debt: Debt) => debt.settledDate !== undefined;

export interface DebtTotals {
  /** Open money others owe the user. */
  owedToMe: number;
  /** Open money the user owes others. */
  iOwe: number;
}

export function debtTotals(debts: Debt[]): DebtTotals {
  let owedToMe = 0;
  let iOwe = 0;
  for (const d of debts) {
    if (isSettled(d)) continue;
    if (d.direction === 'lent') owedToMe += d.amount;
    else iOwe += d.amount;
  }
  return { owedToMe, iOwe };
}

/** Open debts first (oldest first, so the longest-outstanding stand out), then settled ones, newest first. */
export function sortDebts(debts: Debt[]): Debt[] {
  const open = debts.filter((d) => !isSettled(d)).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const settled = debts
    .filter(isSettled)
    .sort((a, b) => b.settledDate!.localeCompare(a.settledDate!) || b.createdAt.localeCompare(a.createdAt));
  return [...open, ...settled];
}

/**
 * Change a debt makes to one wallet's balance: lending takes money out of `walletId`, borrowing adds
 * it; settling reverses that on `settleWalletId`.
 */
export function debtBalanceEffect(debt: Debt, walletId: string): number {
  const sign = debt.direction === 'lent' ? -1 : 1;
  let effect = 0;
  if (debt.walletId === walletId) effect += sign * debt.amount;
  if (debt.settledDate !== undefined && debt.settleWalletId === walletId) effect -= sign * debt.amount;
  return effect;
}

export function debtUsesWallet(debts: Debt[], walletId: string): boolean {
  return debts.some((d) => d.walletId === walletId || d.settleWalletId === walletId);
}
