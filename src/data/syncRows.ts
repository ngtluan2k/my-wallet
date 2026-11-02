import type { RemoteChange, SyncRecord, SyncTable } from '@/domain/sync';
import type { Budget, Category, RecurringRule, Transaction, Wallet } from '@/domain/types';

/** Database row shape (snake_case). user_id is filled in by the server from the session. */
export type Row = Record<string, unknown>;

const orNull = (v: unknown) => (v === undefined ? null : v);
const orUndefined = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);
/** Postgres returns bigint as number via PostgREST JSON; accept numeric strings defensively. */
const toInt = (v: unknown) => (typeof v === 'string' ? Number(v) : (v as number));
/** `date` columns come back as YYYY-MM-DD already. */
const toDate = (v: unknown) => String(v).slice(0, 10);

export function toRow(table: SyncTable, record: SyncRecord): Row {
  switch (table) {
    case 'wallets': {
      const w = record as Wallet;
      return {
        id: w.id,
        name: w.name,
        kind: w.kind,
        icon: w.icon,
        color: w.color,
        opening_balance: w.openingBalance,
        is_default: w.isDefault,
        archived: w.archived ?? false,
        created_at: w.createdAt,
        updated_at: w.updatedAt,
        deleted_at: null,
      };
    }
    case 'categories': {
      const c = record as Category;
      return {
        id: c.id,
        type: c.type,
        built_in_key: orNull(c.builtInKey),
        name: orNull(c.name),
        icon: c.icon,
        color: c.color,
        deleted_at: null,
      };
    }
    case 'transactions': {
      const t = record as Transaction;
      return {
        id: t.id,
        type: t.type,
        amount: t.amount,
        wallet_id: t.walletId,
        to_wallet_id: orNull(t.toWalletId),
        category_id: orNull(t.categoryId),
        transaction_date: t.transactionDate,
        transaction_time: orNull(t.transactionTime),
        note: orNull(t.note),
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        deleted_at: null,
      };
    }
    case 'budgets': {
      const b = record as Budget;
      return { category_id: b.categoryId, limit_amount: b.limit, deleted_at: null };
    }
    case 'recurring': {
      const r = record as RecurringRule;
      return {
        id: r.id,
        type: r.type,
        amount: r.amount,
        wallet_id: r.walletId,
        category_id: r.categoryId,
        note: orNull(r.note),
        frequency: r.frequency,
        start_date: r.startDate,
        next_date: r.nextDate,
        paused: r.paused ?? false,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        deleted_at: null,
      };
    }
  }
}

/** Drops undefined keys so records match what the app writes locally. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** ISO strings from Postgres use "+00:00"; normalize to the app's `toISOString()` form. */
const toIso = (v: unknown) => new Date(String(v)).toISOString();

export function fromRow(table: SyncTable, row: Row): RemoteChange {
  const id = String(table === 'budgets' ? row.category_id : row.id);
  if (row.deleted_at) return { table, id };
  switch (table) {
    case 'wallets':
      return {
        table,
        id,
        record: compact<Wallet>({
          id,
          name: String(row.name),
          kind: row.kind as Wallet['kind'],
          icon: String(row.icon),
          color: String(row.color),
          openingBalance: toInt(row.opening_balance),
          isDefault: Boolean(row.is_default),
          archived: row.archived ? true : undefined,
          createdAt: toIso(row.created_at),
          updatedAt: toIso(row.updated_at),
        }),
      };
    case 'categories':
      return {
        table,
        id,
        record: compact<Category>({
          id,
          type: row.type as Category['type'],
          builtInKey: orUndefined(row.built_in_key as string | null),
          name: orUndefined(row.name as string | null),
          icon: String(row.icon),
          color: String(row.color),
        }),
      };
    case 'transactions':
      return {
        table,
        id,
        record: compact<Transaction>({
          id,
          type: row.type as Transaction['type'],
          amount: toInt(row.amount),
          walletId: String(row.wallet_id),
          toWalletId: orUndefined(row.to_wallet_id as string | null),
          categoryId: orUndefined(row.category_id as string | null),
          transactionDate: toDate(row.transaction_date),
          transactionTime: orUndefined(row.transaction_time as string | null),
          note: orUndefined(row.note as string | null),
          createdAt: toIso(row.created_at),
          updatedAt: toIso(row.updated_at),
        }),
      };
    case 'budgets':
      return { table, id, record: { categoryId: id, limit: toInt(row.limit_amount) } };
    case 'recurring':
      return {
        table,
        id,
        record: compact<RecurringRule>({
          id,
          type: row.type as RecurringRule['type'],
          amount: toInt(row.amount),
          walletId: String(row.wallet_id),
          categoryId: String(row.category_id),
          note: orUndefined(row.note as string | null),
          frequency: row.frequency as RecurringRule['frequency'],
          startDate: toDate(row.start_date),
          nextDate: toDate(row.next_date),
          paused: row.paused ? true : undefined,
          createdAt: toIso(row.created_at),
          updatedAt: toIso(row.updated_at),
        }),
      };
  }
}

/** Key columns for upsert conflict and delete lookups. */
export const KEY_COLUMN: Record<SyncTable, string> = {
  wallets: 'id',
  categories: 'id',
  transactions: 'id',
  budgets: 'category_id',
  recurring: 'id',
};
