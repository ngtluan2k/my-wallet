import type { Budget, Category, Transaction, Wallet, WalletData } from './types';

/**
 * Sync model: the local file is the source of truth. Every committed local change becomes an
 * outbox entry, pushed in order. Pulling applies remote changes except for records that still have
 * a pending local change, so a local edit is never overwritten before it reaches the server.
 */
export type SyncTable = 'wallets' | 'categories' | 'transactions' | 'budgets';

export const SYNC_TABLES: SyncTable[] = ['wallets', 'categories', 'transactions', 'budgets'];

export type SyncRecord = Wallet | Category | Transaction | Budget;

export type SyncOp =
  | { table: SyncTable; id: string; kind: 'upsert'; record: SyncRecord }
  | { table: SyncTable; id: string; kind: 'delete' };

/** A change read from the server. `record` is absent when the row was deleted. */
export interface RemoteChange {
  table: SyncTable;
  id: string;
  record?: SyncRecord;
}

/** Budgets are keyed by category: one limit per expense category. */
export function recordId(table: SyncTable, record: SyncRecord): string {
  return table === 'budgets' ? (record as Budget).categoryId : (record as { id: string }).id;
}

export const syncKey = (table: SyncTable, id: string) => `${table}:${id}`;

function recordsOf(data: WalletData, table: SyncTable): SyncRecord[] {
  return data[table];
}

/** Stable comparison that ignores key order. */
function sameRecord(a: SyncRecord, b: SyncRecord): boolean {
  if (a === b) return true;
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) => (a as unknown as Record<string, unknown>)[k] === (b as unknown as Record<string, unknown>)[k]);
}

/**
 * Operations that turn `prev` into `next`. Parents come first on upsert (wallets, categories before
 * transactions) and last on delete, so foreign keys hold at every step on the server.
 */
export function diffWalletData(prev: WalletData | null, next: WalletData): SyncOp[] {
  const upserts: SyncOp[] = [];
  const deletes: SyncOp[] = [];
  for (const table of SYNC_TABLES) {
    const before = new Map((prev ? recordsOf(prev, table) : []).map((r) => [recordId(table, r), r]));
    const after = new Map(recordsOf(next, table).map((r) => [recordId(table, r), r]));
    for (const [id, record] of after) {
      const old = before.get(id);
      if (!old || !sameRecord(old, record)) upserts.push({ table, id, kind: 'upsert', record });
    }
    for (const id of before.keys()) {
      if (!after.has(id)) deletes.push({ table, id, kind: 'delete' });
    }
  }
  return [...upserts, ...deletes.reverse()];
}

/**
 * Collapses a queue so each record keeps only its latest operation, preserving the position of that
 * latest operation. Keeps the outbox small when the same record is edited many times offline.
 */
export function compactOps(ops: SyncOp[]): SyncOp[] {
  const lastIndex = new Map<string, number>();
  ops.forEach((op, i) => lastIndex.set(syncKey(op.table, op.id), i));
  return ops.filter((op, i) => lastIndex.get(syncKey(op.table, op.id)) === i);
}

/**
 * Applies server changes to local data, skipping records with pending local operations. The result
 * still has to pass `parseWalletData` before it is saved.
 */
export function applyRemoteChanges(data: WalletData, changes: RemoteChange[], pending: Set<string>): WalletData {
  if (!changes.length) return data;
  const tables = Object.fromEntries(
    SYNC_TABLES.map((table) => [table, new Map(recordsOf(data, table).map((r) => [recordId(table, r), r]))]),
  ) as Record<SyncTable, Map<string, SyncRecord>>;

  let changed = false;
  for (const change of changes) {
    if (pending.has(syncKey(change.table, change.id))) continue;
    const table = tables[change.table];
    const existing = table.get(change.id);
    if (change.record) {
      if (existing && sameRecord(existing, change.record)) continue;
      table.set(change.id, change.record);
      changed = true;
    } else if (existing) {
      table.delete(change.id);
      changed = true;
    }
  }
  // Pulls re-read rows this device pushed; returning the same object lets the store skip a save.
  if (!changed) return data;

  return {
    version: data.version,
    wallets: [...tables.wallets.values()] as Wallet[],
    categories: [...tables.categories.values()] as Category[],
    transactions: [...tables.transactions.values()] as Transaction[],
    budgets: [...tables.budgets.values()] as Budget[],
  };
}

export function isEmptyData(data: WalletData): boolean {
  return data.transactions.length === 0 && data.budgets.length === 0;
}
