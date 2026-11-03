import type { Budget, Category, Debt, RecurringRule, Transaction, Wallet, WalletData } from './types';

/**
 * Sync model: the local file is the source of truth. Every committed local change becomes an
 * outbox entry, pushed in order. Pulling applies remote changes except for records that still have
 * a pending local change, so a local edit is never overwritten before it reaches the server.
 */
export type SyncTable = 'wallets' | 'categories' | 'transactions' | 'budgets' | 'recurring' | 'debts';

export const SYNC_TABLES: SyncTable[] = ['wallets', 'categories', 'transactions', 'budgets', 'recurring', 'debts'];

export type SyncRecord = Wallet | Category | Transaction | Budget | RecurringRule | Debt;

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
    recurring: [...tables.recurring.values()] as RecurringRule[],
    debts: [...tables.debts.values()] as Debt[],
  };
}

/**
 * Pending local operations that lost to a newer server version. Records with `updatedAt`
 * (wallets, transactions) are compared last-write-wins: if the server's copy was edited after the
 * local one, the local operation is dropped and the server's copy applied. Records without a
 * timestamp (categories, budgets) and remote deletions keep the local pending change.
 */
export function supersededByRemote(data: WalletData, changes: RemoteChange[], pending: Set<string>): Set<string> {
  const superseded = new Set<string>();
  const locals = new Map<string, SyncRecord>();
  for (const table of SYNC_TABLES) for (const r of recordsOf(data, table)) locals.set(syncKey(table, recordId(table, r)), r);
  for (const change of changes) {
    const key = syncKey(change.table, change.id);
    if (!pending.has(key) || !change.record) continue;
    const remoteAt = (change.record as { updatedAt?: string }).updatedAt;
    const localAt = (locals.get(key) as { updatedAt?: string } | undefined)?.updatedAt;
    if (remoteAt && localAt && Date.parse(remoteAt) > Date.parse(localAt)) superseded.add(key);
  }
  return superseded;
}

/**
 * Like `applyRemoteChanges`, but never lets one bad server row block the rest. If the merged data
 * fails validation, changes that make it invalid are left out (found by trying the merge without
 * each one), and as a last resort changes are applied one at a time, keeping those that validate.
 */
export function applyRemoteChangesSafely(
  data: WalletData,
  changes: RemoteChange[],
  pending: Set<string>,
  validate: (candidate: WalletData) => WalletData | null,
): { data: WalletData; skipped: RemoteChange[] } {
  const merged = applyRemoteChanges(data, changes, pending);
  if (merged === data) return { data, skipped: [] };
  const valid = validate(merged);
  if (valid) return { data: valid, skipped: [] };

  // Leave-one-out: usually a single malformed row; this keeps coupled changes (such as moving the
  // default flag between two wallets) together.
  let kept = changes;
  const skipped: RemoteChange[] = [];
  for (let round = 0; round < MAX_SKIPPED_CHANGES; round++) {
    const culprit = kept.findIndex((_, i) => validate(applyRemoteChanges(data, kept.filter((__, j) => j !== i), pending)));
    if (culprit < 0) break;
    skipped.push(kept[culprit]);
    kept = kept.filter((_, j) => j !== culprit);
    const result = validate(applyRemoteChanges(data, kept, pending));
    if (result) return { data: result, skipped };
  }

  let current = data;
  for (const change of kept) {
    const next = applyRemoteChanges(current, [change], pending);
    if (next === current) continue;
    const result = validate(next);
    if (result) current = result;
    else skipped.push(change);
  }
  return { data: current, skipped };
}

const MAX_SKIPPED_CHANGES = 5;

export function isEmptyData(data: WalletData): boolean {
  return data.transactions.length === 0 && data.budgets.length === 0 && data.debts.length === 0;
}
