import { createInitialData } from '@/domain/walletData';
import type { WalletData } from '@/domain/types';

import type { WalletRepository } from './WalletRepository';

/** In-memory repository for tests. Stores a deep copy so callers can't mutate saved state. */
export class MemoryRepository implements WalletRepository {
  saved: WalletData | null;
  failNextSave = false;

  constructor(initial: WalletData | null = null) {
    this.saved = initial;
  }

  async load(): Promise<WalletData> {
    return structuredClone(this.saved ?? createInitialData());
  }

  async save(data: WalletData): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('write_failed');
    }
    this.saved = structuredClone(data);
  }
}
