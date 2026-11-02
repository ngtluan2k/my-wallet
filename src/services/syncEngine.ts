import { diffWalletData, SYNC_TABLES, syncKey, type RemoteChange, type SyncOp, type SyncTable } from '@/domain/sync';
import type { WalletData } from '@/domain/types';
import type { Outbox } from '@/data/outbox';
import { fromRow, toRow, type Row } from '@/data/syncRows';

/** Server access, implemented with Supabase in production and faked in tests. */
export interface RemoteApi {
  upsert(table: SyncTable, rows: Row[]): Promise<void>;
  softDelete(table: SyncTable, ids: string[]): Promise<void>;
  /** Rows written at or after `since` (ISO), oldest first, each with `server_updated_at`. */
  pull(table: SyncTable, since: string | null): Promise<Row[]>;
}

export interface CursorStore {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
}

export interface SyncTarget {
  getData(): WalletData | null;
  applyRemote(changes: RemoteChange[], pending: Set<string>): Promise<void>;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncSnapshot {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: string | null;
  error: unknown;
}

/**
 * Pulls overlap the previous cursor by this much, since rows written in a transaction that
 * committed late can carry an earlier server time. Re-applying a row is harmless.
 */
const PULL_OVERLAP_MS = 60_000;
const PUSH_BATCH = 200;
const EPOCH = new Date(0).toISOString();

export interface SyncEngineDeps {
  remote: RemoteApi;
  outbox: Outbox;
  cursor: CursorStore;
  target: SyncTarget;
  onChange?: (snapshot: SyncSnapshot) => void;
  now?: () => Date;
}

export function createSyncEngine({ remote, outbox, cursor, target, onChange, now = () => new Date() }: SyncEngineDeps) {
  let snapshot: SyncSnapshot = { status: 'idle', pending: 0, lastSyncedAt: null, error: null };
  let running: Promise<void> | null = null;
  let rerun = false;

  function update(patch: Partial<SyncSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    onChange?.(snapshot);
  }

  async function refreshPending() {
    update({ pending: (await outbox.list()).length });
  }

  /** Pushes queued operations in order, in batches of consecutive same-table, same-kind ops. */
  async function flush() {
    for (;;) {
      const ops = await outbox.list();
      if (!ops.length) break;
      const first = ops[0];
      let count = 1;
      while (
        count < ops.length &&
        count < PUSH_BATCH &&
        ops[count].table === first.table &&
        ops[count].kind === first.kind
      ) {
        count++;
      }
      const batch = ops.slice(0, count);
      if (first.kind === 'upsert') {
        await remote.upsert(
          first.table,
          batch.map((op) => toRow(op.table, (op as Extract<SyncOp, { kind: 'upsert' }>).record)),
        );
      } else {
        await remote.softDelete(first.table, batch.map((op) => op.id));
      }
      await outbox.dropFirst(count);
      update({ pending: ops.length - count });
    }
  }

  async function pull(since: string | null): Promise<{ changes: RemoteChange[]; latest: string | null }> {
    const changes: RemoteChange[] = [];
    let latest: string | null = null;
    for (const table of SYNC_TABLES) {
      for (const row of await remote.pull(table, since)) {
        changes.push(fromRow(table, row));
        const at = String(row.server_updated_at);
        if (!latest || Date.parse(at) > Date.parse(latest)) latest = at;
      }
    }
    return { changes, latest };
  }

  async function pendingKeys(): Promise<Set<string>> {
    return new Set((await outbox.list()).map((op) => syncKey(op.table, op.id)));
  }

  /**
   * First sync on this device: queue every local record the server doesn't have (deleted rows
   * count as present, so a deletion made elsewhere wins), then take everything else from the server.
   */
  async function firstSync() {
    const data = target.getData();
    const { changes, latest } = await pull(null);
    if (data) {
      const remoteKeys = new Set(changes.map((c) => syncKey(c.table, c.id)));
      const missing = diffWalletData(null, data).filter((op) => !remoteKeys.has(syncKey(op.table, op.id)));
      await outbox.append(missing);
    }
    await target.applyRemote(changes, await pendingKeys());
    await flush();
    // The cursor only ever holds server times; device clocks can't be trusted against them. With an
    // empty server, start from the epoch: the next pull re-reads our own pushes once, harmlessly.
    await cursor.set(latest ?? EPOCH);
  }

  async function incrementalSync(since: string) {
    await flush();
    const from = new Date(Date.parse(since) - PULL_OVERLAP_MS).toISOString();
    const { changes, latest } = await pull(from);
    await target.applyRemote(changes, await pendingKeys());
    if (latest && Date.parse(latest) > Date.parse(since)) await cursor.set(latest);
  }

  async function runOnce() {
    if (!target.getData()) return;
    update({ status: 'syncing', error: null });
    try {
      const since = await cursor.get();
      if (since) await incrementalSync(since);
      else await firstSync();
      update({ status: 'idle', lastSyncedAt: now().toISOString() });
    } catch (error) {
      update({ status: 'error', error });
    } finally {
      await refreshPending().catch(() => undefined);
    }
  }

  return {
    get snapshot() {
      return snapshot;
    },

    /** Records committed local changes. Call `sync()` (or `scheduleSync`) to push them. */
    async enqueue(ops: SyncOp[]) {
      await outbox.append(ops);
      await refreshPending();
    },

    /** Runs one full push/pull. Concurrent calls share the run; a call during a run queues one more. */
    sync(): Promise<void> {
      if (running) {
        rerun = true;
        return running;
      }
      running = (async () => {
        do {
          rerun = false;
          await runOnce();
        } while (rerun);
      })().finally(() => {
        running = null;
      });
      return running;
    },

    refreshPending,
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
