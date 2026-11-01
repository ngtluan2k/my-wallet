import { DEFAULT_CATEGORIES } from './categories';
import { isValidLocalDate } from './dates';
import { isValidAmount } from './money';
import { MAX_NOTE_LENGTH } from './transactions';
import type { Budget, Category, Transaction, Wallet, WalletData } from './types';

export const CURRENT_VERSION = 1;
export const BACKUP_APP_ID = 'my-wallet';

export function createInitialData(): WalletData {
  return { version: CURRENT_VERSION, transactions: [], categories: DEFAULT_CATEGORIES, budgets: [], wallets: [] };
}

export type ParseError = 'not_json' | 'invalid_format' | 'unsupported_version' | 'not_a_backup';
export type ParseResult = { ok: true; data: WalletData } | { ok: false; error: ParseError };

/**
 * Upgrades stored data one version at a time. Add an entry here when CURRENT_VERSION goes up:
 * key N converts data from version N to N + 1.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isType = (v: unknown) => v === 'income' || v === 'expense';
const isTimestamp = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

function isCategory(v: unknown): v is Category {
  return (
    isObject(v) &&
    isNonEmptyString(v.id) &&
    isType(v.type) &&
    (v.builtInKey === undefined || isNonEmptyString(v.builtInKey)) &&
    (v.name === undefined || isNonEmptyString(v.name)) &&
    (v.builtInKey !== undefined || v.name !== undefined) &&
    isNonEmptyString(v.icon) &&
    isNonEmptyString(v.color)
  );
}

function isTransaction(v: unknown): v is Transaction {
  return (
    isObject(v) &&
    isNonEmptyString(v.id) &&
    isType(v.type) &&
    isValidAmount(v.amount) &&
    isNonEmptyString(v.categoryId) &&
    isValidLocalDate(v.transactionDate) &&
    (v.note === undefined || (typeof v.note === 'string' && v.note.length <= MAX_NOTE_LENGTH)) &&
    isTimestamp(v.createdAt) &&
    isTimestamp(v.updatedAt)
  );
}

function isBudget(v: unknown): v is Budget {
  return isObject(v) && isNonEmptyString(v.categoryId) && isValidAmount(v.limit);
}

function isWallet(v: unknown): v is Wallet {
  return isObject(v) && isNonEmptyString(v.id) && isNonEmptyString(v.name) && 
    isValidAmount(v.openingBalance) && isNonEmptyString(v.currency) && typeof v.isDefault === 'boolean';
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

  const { transactions, categories, budgets, wallets } = data;
  if (
    !Array.isArray(transactions) || !transactions.every(isTransaction) ||
    !Array.isArray(categories) || !categories.every(isCategory) ||
    !Array.isArray(budgets) || !budgets.every(isBudget) ||
    !Array.isArray(wallets) || !wallets.every(isWallet)
  ) {
    return { ok: false, error: 'invalid_format' };
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const ids = new Set<string>();
  for (const t of transactions) {
    if (ids.has(t.id)) return { ok: false, error: 'invalid_format' };
    ids.add(t.id);
    if (categoryById.get(t.categoryId)?.type !== t.type) return { ok: false, error: 'invalid_format' };
  }
  if (categoryById.size !== categories.length) return { ok: false, error: 'invalid_format' };
  if (budgets.some((b) => categoryById.get(b.categoryId)?.type !== 'expense')) {
    return { ok: false, error: 'invalid_format' };
  }
  // Validate wallet uniqueness
  const walletIds = new Set<string>();
  for (const w of wallets) {
    if (walletIds.has(w.id)) return { ok: false, error: 'invalid_format' };
    walletIds.add(w.id);
  }

  return { ok: true, data: { version: CURRENT_VERSION, transactions, categories, budgets, wallets } };
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
