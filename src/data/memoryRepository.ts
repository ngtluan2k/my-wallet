import type { WalletData } from '@/domain/types';

import type { WalletRepository } from './WalletRepository';

/** In-memory repository for tests. Stores a deep copy so callers can't mutate saved state. */
export class MemoryRepository implements WalletRepository {
  saved: WalletData | null;
  failNextSave = false;
  failLoad: Error | null = null;

  constructor(initial: WalletData | null = null) {
    this.saved = initial;
  }

  async load(): Promise<WalletData | null> {
    if (this.failLoad) throw this.failLoad;
    return this.saved ? structuredClone(this.saved) : null;
  }

  async save(data: WalletData): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('write_failed');
    }
    this.saved = structuredClone(data);
  }
}
