import { DEFAULT_CATEGORIES } from './categories';
import { MAX_PERSON_LENGTH } from './debts';
import { isValidLocalDate } from './dates';
import { isValidAmount, isValidBalance } from './money';
import { isValidLocalTime, MAX_NOTE_LENGTH } from './transactions';
import type { Budget, Category, Debt, RecurringRule, Transaction, Wallet, WalletData } from './types';
import { createDefaultWallet, DEFAULT_WALLET_ID, MAX_WALLET_NAME_LENGTH } from './wallets';

export const CURRENT_VERSION = 4;
export const BACKUP_APP_ID = 'my-wallet';

/** Name given to the wallet created for existing data. Users can rename it. */
export const MIGRATED_WALLET_NAME = 'Ví chính';

export function createInitialData(defaultWalletName: string, now: Date = new Date()): WalletData {
  return {
    version: CURRENT_VERSION,
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    budgets: [],
    wallets: [createDefaultWallet(defaultWalletName, now)],
    recurring: [],
    debts: [],
  };
}

export type ParseError = 'not_json' | 'invalid_format' | 'unsupported_version' | 'not_a_backup';
export type ParseResult = { ok: true; data: WalletData } | { ok: false; error: ParseError };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isCategoryType = (v: unknown) => v === 'income' || v === 'expense';
const isTransactionType = (v: unknown) => isCategoryType(v) || v === 'transfer';
const isTimestamp = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * Upgrades stored data one version at a time. Add an entry here when CURRENT_VERSION goes up:
 * key N converts data from version N to N + 1.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // v4 adds debts (money lent and borrowed).
  3: (data) => ({ ...data, debts: [] }),
  // v3 adds recurring transactions.
  2: (data) => ({ ...data, recurring: [] }),
  // v2 adds wallets. Every v1 transaction moves to one default wallet. Some v1 files written by a
  // development build carry `wallets: []`; they are treated the same as files without wallets.
  1: (data) => {
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const timestamps = transactions
      .map((t) => (isObject(t) && isTimestamp(t.createdAt) ? (t.createdAt as string) : null))
      .filter((t): t is string => t !== null)
      .sort();
    const createdAt = new Date(timestamps[0] ?? Date.now());
    return {
      ...data,
      wallets: [createDefaultWallet(MIGRATED_WALLET_NAME, createdAt)],
      transactions: transactions.map((t) => (isObject(t) ? { ...t, walletId: DEFAULT_WALLET_ID } : t)),
    };
  },
};

function isCategory(v: unknown): v is Category {
  return (
    isObject(v) &&
    isNonEmptyString(v.id) &&
    isCategoryType(v.type) &&
    (v.builtInKey === undefined || isNonEmptyString(v.builtInKey)) &&
    (v.name === undefined || isNonEmptyString(v.name)) &&
    (v.builtInKey !== undefined || v.name !== undefined) &&
    isNonEmptyString(v.icon) &&
    isNonEmptyString(v.color)
  );
}

function isTransaction(v: unknown): v is Transaction {
  if (
    !isObject(v) ||
    !isNonEmptyString(v.id) ||
    !isTransactionType(v.type) ||
    !isValidAmount(v.amount) ||
    !isNonEmptyString(v.walletId) ||
    !isValidLocalDate(v.transactionDate) ||
    !(v.transactionTime === undefined || isValidLocalTime(v.transactionTime)) ||
    !(v.note === undefined || (typeof v.note === 'string' && v.note.length <= MAX_NOTE_LENGTH)) ||
    !isTimestamp(v.createdAt) ||
    !isTimestamp(v.updatedAt)
  ) {
    return false;
  }
  return v.type === 'transfer'
    ? isNonEmptyString(v.toWalletId) && v.toWalletId !== v.walletId && v.categoryId === undefined
    : isNonEmptyString(v.categoryId) && v.toWalletId === undefined;
}

function isRecurringRule(v: unknown): v is RecurringRule {
  return (
    isObject(v) &&
    isNonEmptyString(v.id) &&
    isCategoryType(v.type) &&
    isValidAmount(v.amount) &&
    isNonEmptyString(v.walletId) &&
    isNonEmptyString(v.categoryId) &&
    (v.note === undefined || (typeof v.note === 'string' && v.note.length <= MAX_NOTE_LENGTH)) &&
    (v.frequency === 'weekly' || v.frequency === 'monthly') &&
    isValidLocalDate(v.startDate) &&
    isValidLocalDate(v.nextDate) &&
    (v.nextDate as string) >= (v.startDate as string) &&
    (v.paused === undefined || typeof v.paused === 'boolean') &&
    isTimestamp(v.createdAt) &&
    isTimestamp(v.updatedAt)
  );
}

function isDebt(v: unknown): v is Debt {
  if (
    !isObject(v) ||
    !isNonEmptyString(v.id) ||
    !(v.direction === 'lent' || v.direction === 'borrowed') ||
    typeof v.person !== 'string' ||
    v.person.trim().length === 0 ||
    v.person.length > MAX_PERSON_LENGTH ||
    !isValidAmount(v.amount) ||
    !isNonEmptyString(v.walletId) ||
    !isValidLocalDate(v.date) ||
    !(v.note === undefined || (typeof v.note === 'string' && v.note.length <= MAX_NOTE_LENGTH)) ||
    !isTimestamp(v.createdAt) ||
    !isTimestamp(v.updatedAt)
  ) {
    return false;
  }
  // A settlement has both a date (not before the debt) and a wallet, or neither.
  if (v.settledDate === undefined) return v.settleWalletId === undefined;
  return isValidLocalDate(v.settledDate) && (v.settledDate as string) >= (v.date as string) && isNonEmptyString(v.settleWalletId);
}

function isBudget(v: unknown): v is Budget {
  return isObject(v) && isNonEmptyString(v.categoryId) && isValidAmount(v.limit);
}

function isWallet(v: unknown): v is Wallet {
  return (
    isObject(v) &&
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    (v.name as string).length <= MAX_WALLET_NAME_LENGTH &&
    (v.kind === 'cash' || v.kind === 'bank' || v.kind === 'ewallet') &&
    isNonEmptyString(v.icon) &&
    isNonEmptyString(v.color) &&
    isValidBalance(v.openingBalance) &&
    typeof v.isDefault === 'boolean' &&
    (v.archived === undefined || typeof v.archived === 'boolean') &&
    isTimestamp(v.createdAt) &&
    isTimestamp(v.updatedAt)
  );
}

/** Validates and migrates unknown input into WalletData. Never partially accepts invalid data. */
export function parseWalletData(raw: unknown): ParseResult {
  if (!isObject(raw) || !Number.isInteger(raw.version) || (raw.version as number) < 1) {
    return { ok: false, error: 'invalid_format' };
  }
  if ((raw.version as number) > CURRENT_VERSION) return { ok: false, error: 'unsupported_version' };

  let data = raw;
  for (let v = raw.version as number; v < CURRENT_VERSION; v++) {
    data = { ...MIGRATIONS[v](data), version: v + 1 };
  }

  const { transactions, categories, budgets, wallets, recurring, debts } = data;
  if (
    !Array.isArray(debts) || !debts.every(isDebt) ||
    !Array.isArray(recurring) || !recurring.every(isRecurringRule) ||
    !Array.isArray(transactions) || !transactions.every(isTransaction) ||
    !Array.isArray(categories) || !categories.every(isCategory) ||
    !Array.isArray(budgets) || !budgets.every(isBudget) ||
    !Array.isArray(wallets) || !wallets.every(isWallet)
  ) {
    return { ok: false, error: 'invalid_format' };
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  if (categoryById.size !== categories.length) return { ok: false, error: 'invalid_format' };

  const walletIds = new Set(wallets.map((w) => w.id));
  if (walletIds.size !== wallets.length) return { ok: false, error: 'invalid_format' };
  const activeDefaults = wallets.filter((w) => w.isDefault && !w.archived);
  if (activeDefaults.length !== 1) return { ok: false, error: 'invalid_format' };

  const ids = new Set<string>();
  for (const t of transactions) {
    if (ids.has(t.id)) return { ok: false, error: 'invalid_format' };
    ids.add(t.id);
    if (!walletIds.has(t.walletId)) return { ok: false, error: 'invalid_format' };
    if (t.type === 'transfer') {
      if (!walletIds.has(t.toWalletId!)) return { ok: false, error: 'invalid_format' };
    } else if (categoryById.get(t.categoryId!)?.type !== t.type) {
      return { ok: false, error: 'invalid_format' };
    }
  }

  if (budgets.some((b) => categoryById.get(b.categoryId)?.type !== 'expense')) {
    return { ok: false, error: 'invalid_format' };
  }
  if (new Set(budgets.map((b) => b.categoryId)).size !== budgets.length) return { ok: false, error: 'invalid_format' };

  if (new Set(recurring.map((r) => r.id)).size !== recurring.length) return { ok: false, error: 'invalid_format' };
  if (recurring.some((r) => !walletIds.has(r.walletId) || categoryById.get(r.categoryId)?.type !== r.type)) {
    return { ok: false, error: 'invalid_format' };
  }

  if (new Set(debts.map((d) => d.id)).size !== debts.length) return { ok: false, error: 'invalid_format' };
  if (debts.some((d) => !walletIds.has(d.walletId) || (d.settleWalletId !== undefined && !walletIds.has(d.settleWalletId)))) {
    return { ok: false, error: 'invalid_format' };
  }

  return { ok: true, data: { version: CURRENT_VERSION, transactions, categories, budgets, wallets, recurring, debts } };
}

export function parseWalletJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  return parseWalletData(raw);
}

export function serializeBackup(data: WalletData, now: Date): string {
  return JSON.stringify({ app: BACKUP_APP_ID, exportedAt: now.toISOString(), ...data }, null, 2);
}

/** Parses a backup file. The result must be fully valid before it replaces current data. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP_ID) return { ok: false, error: 'not_a_backup' };
  const { app: _app, exportedAt: _exportedAt, ...rest } = raw;
  return parseWalletData(rest);
}
