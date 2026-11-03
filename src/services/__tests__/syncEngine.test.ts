import { MemoryOutbox } from '@/data/outbox';
import type { Row } from '@/data/syncRows';
import { applyRemoteChanges, type RemoteChange, type SyncTable } from '@/domain/sync';
import { createTransaction } from '@/domain/transactions';
import type { WalletData } from '@/domain/types';
import { createInitialData } from '@/domain/walletData';

import { createSyncEngine, type RemoteApi } from '../syncEngine';

const now = new Date('2026-10-28T03:00:00.000Z');

/** In-memory server with the same soft-delete and server time semantics as the SQL schema. */
class FakeRemote implements RemoteApi {
  tables: Record<SyncTable, Map<string, Row>> = {
    wallets: new Map(),
    categories: new Map(),
    transactions: new Map(),
    budgets: new Map(),
    recurring: new Map(),
    debts: new Map(),
  };
  clock = Date.parse('2026-10-28T00:00:00.000Z');
  failNext = false;

  private stamp() {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  async upsert(table: SyncTable, rows: Row[]) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('offline');
    }
    for (const row of rows) {
      const key = String(table === 'budgets' ? row.category_id : row.id);
      this.tables[table].set(key, { ...row, server_updated_at: this.stamp() });
    }
  }

  async softDelete(table: SyncTable, ids: string[]) {
    for (const id of ids) {
      const row = this.tables[table].get(id);
      if (row) this.tables[table].set(id, { ...row, deleted_at: 'x', server_updated_at: this.stamp() });
    }
  }

  async pull(table: SyncTable, since: string | null) {
    return [...this.tables[table].values()]
      .filter((r) => !since || Date.parse(String(r.server_updated_at)) >= Date.parse(since))
      .sort((a, b) => String(a.server_updated_at).localeCompare(String(b.server_updated_at)));
  }
}

function device(remote: FakeRemote, data: WalletData) {
  let current = data;
  let cursorValue: string | null = null;
  const outbox = new MemoryOutbox();
  const engine = createSyncEngine({
    remote,
    outbox,
    cursor: { get: async () => cursorValue, set: async (v) => void (cursorValue = v) },
    target: {
      getData: () => current,
      applyRemote: async (changes: RemoteChange[], pending: Set<string>) => {
        current = applyRemoteChanges(current, changes, pending);
      },
    },
    now: () => now,
  });
  return {
    engine,
    outbox,
    get data() {
      return current;
    },
    set data(next: WalletData) {
      current = next;
    },
  };
}

const tx = (id: string, amount: number) =>
  createTransaction({ type: 'expense', amount, walletId: 'wallet-default', categoryId: 'exp-food', transactionDate: '2026-10-28' }, id, now);

describe('sync engine', () => {
  it('pushes a first device fully and pulls it on a second device', async () => {
    const remote = new FakeRemote();
    const a = device(remote, { ...createInitialData('Ví chính', now), transactions: [tx('t1', 1000)] });
    await a.engine.sync();
    expect(remote.tables.transactions.size).toBe(1);
    expect(remote.tables.categories.size).toBe(a.data.categories.length);

    // A new device starts with fresh defaults; the server's data wins and nothing is pushed back.
    const renamed = { ...createInitialData('Main', now) };
    const b = device(remote, renamed);
    await b.engine.sync();
    expect(b.data.transactions.map((t) => t.id)).toEqual(['t1']);
    expect(b.data.wallets[0].name).toBe('Ví chính');
    expect(b.engine.snapshot).toMatchObject({ status: 'idle', pending: 0 });
  });

  it('syncs debts between devices', async () => {
    const remote = new FakeRemote();
    const debt = {
      id: 'd1',
      direction: 'lent' as const,
      person: 'Minh',
      amount: 500_000,
      walletId: 'wallet-default',
      date: '2026-10-27',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const a = device(remote, { ...createInitialData('Ví chính', now), debts: [debt] });
    await a.engine.sync();
    expect(remote.tables.debts.size).toBe(1);

    const b = device(remote, createInitialData('Main', now));
    await b.engine.sync();
    expect(b.data.debts).toEqual([debt]);
  });

  it('propagates edits and deletions between devices', async () => {
    const remote = new FakeRemote();
    const a = device(remote, { ...createInitialData('Ví chính', now), transactions: [tx('t1', 1000), tx('t2', 2000)] });
    await a.engine.sync();
    const b = device(remote, createInitialData('Ví chính', now));
    await b.engine.sync();

    await b.engine.enqueue([
      { table: 'transactions', id: 't1', kind: 'upsert', record: { ...tx('t1', 1500) } },
      { table: 'transactions', id: 't2', kind: 'delete' },
    ]);
    await b.engine.sync();

    await a.engine.sync();
    expect(a.data.transactions.map((t) => [t.id, t.amount])).toEqual([['t1', 1500]]);
  });

  it('keeps unpushed local changes when offline and pushes them later', async () => {
    const remote = new FakeRemote();
    const a = device(remote, createInitialData('Ví chính', now));
    await a.engine.sync();

    a.data = { ...a.data, transactions: [tx('t9', 9)] };
    await a.engine.enqueue([{ table: 'transactions', id: 't9', kind: 'upsert', record: tx('t9', 9) }]);
    remote.failNext = true;
    await a.engine.sync();
    expect(a.engine.snapshot).toMatchObject({ status: 'error', pending: 1 });
    expect(a.data.transactions).toHaveLength(1);

    await a.engine.sync();
    expect(a.engine.snapshot).toMatchObject({ status: 'idle', pending: 0 });
    expect(remote.tables.transactions.has('t9')).toBe(true);
  });

  it('lets the later edit win when two devices change the same transaction', async () => {
    const remote = new FakeRemote();
    const a = device(remote, { ...createInitialData('Ví chính', now), transactions: [tx('t1', 1000)] });
    await a.engine.sync();
    const b = device(remote, createInitialData('Ví chính', now));
    await b.engine.sync();

    // A edits offline at 10:00; B edits the same transaction at 11:00 and syncs first.
    const older = { ...tx('t1', 2000), updatedAt: '2026-10-28T10:00:00.000Z' };
    const newer = { ...tx('t1', 3000), updatedAt: '2026-10-28T11:00:00.000Z' };
    a.data = { ...a.data, transactions: [older] };
    await a.engine.enqueue([{ table: 'transactions', id: 't1', kind: 'upsert', record: older }]);
    b.data = { ...b.data, transactions: [newer] };
    await b.engine.enqueue([{ table: 'transactions', id: 't1', kind: 'upsert', record: newer }]);
    await b.engine.sync();

    await a.engine.sync();
    expect(a.data.transactions.map((t) => t.amount)).toEqual([3000]);
    expect(remote.tables.transactions.get('t1')?.amount).toBe(3000);
    expect(a.engine.snapshot).toMatchObject({ status: 'idle', pending: 0 });
  });
});
