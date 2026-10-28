import type { WalletData } from '@/domain/types';

/** Persistence boundary. UI and state talk to this, never to files directly. */
export interface WalletRepository {
  /** Returns initial data when nothing is stored yet. Throws StorageError if stored data is unreadable. */
  load(): Promise<WalletData>;
  save(data: WalletData): Promise<void>;
}

export type StorageErrorCode = 'read_failed' | 'corrupt' | 'unsupported_version' | 'write_failed';

export class StorageError extends Error {
  constructor(
    readonly code: StorageErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = 'StorageError';
  }
}
