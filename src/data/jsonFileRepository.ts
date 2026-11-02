import { File, Paths } from 'expo-file-system';

import { parseWalletJson } from '@/domain/walletData';
import type { WalletData } from '@/domain/types';

import { StorageError, type WalletRepository } from './WalletRepository';

/** File used before accounts existed. Offered for import on first sign-in, never written again. */
export const LEGACY_FILE_NAME = 'wallet.json';

export function userFileName(userId: string): string {
  return `wallet-${userId.replace(/[^A-Za-z0-9-]/g, '')}.json`;
}

/**
 * Stores everything in one JSON file in the app's document directory.
 *
 * Saves write the full file to a temp file first, then swap it in. The main file is only deleted
 * after the temp file is fully written, so if the main file is missing, the temp file is complete
 * and load() recovers from it.
 */
export class JsonFileRepository implements WalletRepository {
  constructor(private readonly fileName: string) {}

  private get tempName() {
    return `${this.fileName}.tmp`;
  }

  async load(): Promise<WalletData | null> {
    const main = new File(Paths.document, this.fileName);
    const temp = new File(Paths.document, this.tempName);
    const source = main.exists ? main : temp.exists ? temp : null;
    if (!source) return null;

    let text: string;
    try {
      text = await source.text();
    } catch (cause) {
      throw new StorageError('read_failed', { cause });
    }
    const result = parseWalletJson(text);
    if (!result.ok) {
      throw new StorageError(result.error === 'unsupported_version' ? 'unsupported_version' : 'corrupt');
    }
    if (source === temp) temp.rename(this.fileName);
    return result.data;
  }

  async save(data: WalletData): Promise<void> {
    try {
      const temp = new File(Paths.document, this.tempName);
      await temp.write(JSON.stringify(data));
      const main = new File(Paths.document, this.fileName);
      if (main.exists) main.delete();
      temp.rename(this.fileName);
    } catch (cause) {
      throw new StorageError('write_failed', { cause });
    }
  }
}

/** Reads the pre-account data file, if any. Returns null when missing or unreadable. */
export async function readLegacyData(): Promise<WalletData | null> {
  try {
    return await new JsonFileRepository(LEGACY_FILE_NAME).load();
  } catch {
    return null;
  }
}

/** Marks the legacy file as handled so it isn't offered again. The data stays on disk as a backup. */
export function retireLegacyData(): void {
  try {
    const legacy = new File(Paths.document, LEGACY_FILE_NAME);
    if (legacy.exists) legacy.rename(`${LEGACY_FILE_NAME}.imported`);
  } catch {
    // Offering it again next time is harmless.
  }
}
