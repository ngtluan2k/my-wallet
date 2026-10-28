import { File, Paths } from 'expo-file-system';

import { createInitialData, parseWalletJson } from '@/domain/walletData';
import type { WalletData } from '@/domain/types';

import { StorageError, type WalletRepository } from './WalletRepository';

const FILE_NAME = 'wallet.json';
const TEMP_NAME = 'wallet.json.tmp';

/**
 * Stores everything in one JSON file in the app's document directory.
 *
 * Saves write the full file to a temp file first, then swap it in. The main file is only deleted
 * after the temp file is fully written, so if the main file is missing, the temp file is complete
 * and load() recovers from it.
 */
export class JsonFileRepository implements WalletRepository {
  async load(): Promise<WalletData> {
    const main = new File(Paths.document, FILE_NAME);
    const temp = new File(Paths.document, TEMP_NAME);
    const source = main.exists ? main : temp.exists ? temp : null;
    if (!source) return createInitialData();

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
    if (source === temp) temp.rename(FILE_NAME);
    return result.data;
  }

  async save(data: WalletData): Promise<void> {
    try {
      const temp = new File(Paths.document, TEMP_NAME);
      await temp.write(JSON.stringify(data));
      const main = new File(Paths.document, FILE_NAME);
      if (main.exists) main.delete();
      temp.rename(FILE_NAME);
    } catch (cause) {
      throw new StorageError('write_failed', { cause });
    }
  }
}
