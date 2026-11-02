import { File, Paths } from 'expo-file-system';

import { compactOps, syncKey, type SyncOp } from '@/domain/sync';

/** Durable, ordered queue of local changes waiting to reach the server. */
export interface Outbox {
  list(): Promise<SyncOp[]>;
  append(ops: SyncOp[]): Promise<void>;
  /** Removes the first `count` entries after they were pushed. */
  dropFirst(count: number): Promise<void>;
  /** Removes entries by `syncKey`, e.g. local changes superseded by a newer server version. */
  remove(keys: Set<string>): Promise<void>;
}

/** Outbox kept in memory, for tests. */
export class MemoryOutbox implements Outbox {
  ops: SyncOp[] = [];
  async list() {
    return [...this.ops];
  }
  async append(ops: SyncOp[]) {
    this.ops = compactOps([...this.ops, ...ops]);
  }
  async dropFirst(count: number) {
    this.ops = this.ops.slice(count);
  }
  async remove(keys: Set<string>) {
    this.ops = this.ops.filter((op) => !keys.has(syncKey(op.table, op.id)));
  }
}

/**
 * Outbox persisted as JSON next to the user's wallet file. Writes go through a temp file like the
 * wallet itself. Calls are serialized so appends and drops never interleave.
 */
export class FileOutbox implements Outbox {
  private cache: SyncOp[] | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly fileName: string) {}

  private run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async read(): Promise<SyncOp[]> {
    if (this.cache) return this.cache;
    const file = new File(Paths.document, this.fileName);
    try {
      const parsed: unknown = file.exists ? JSON.parse(await file.text()) : [];
      this.cache = Array.isArray(parsed) ? (parsed as SyncOp[]) : [];
    } catch {
      // A damaged outbox only delays sync; the next full sync re-pushes local records.
      this.cache = [];
    }
    return this.cache;
  }

  private async write(ops: SyncOp[]): Promise<void> {
    const temp = new File(Paths.document, `${this.fileName}.tmp`);
    await temp.write(JSON.stringify(ops));
    const main = new File(Paths.document, this.fileName);
    if (main.exists) main.delete();
    temp.rename(this.fileName);
    this.cache = ops;
  }

  list() {
    return this.run(async () => [...(await this.read())]);
  }

  append(ops: SyncOp[]) {
    return this.run(async () => {
      if (!ops.length) return;
      await this.write(compactOps([...(await this.read()), ...ops]));
    });
  }

  dropFirst(count: number) {
    return this.run(async () => {
      await this.write((await this.read()).slice(count));
    });
  }

  remove(keys: Set<string>) {
    return this.run(async () => {
      const ops = await this.read();
      const kept = ops.filter((op) => !keys.has(syncKey(op.table, op.id)));
      if (kept.length !== ops.length) await this.write(kept);
    });
  }
}

export function userOutboxName(userId: string): string {
  return `outbox-${userId.replace(/[^A-Za-z0-9-]/g, '')}.json`;
}
