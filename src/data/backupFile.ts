import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { today } from '@/domain/dates';
import { parseBackup, serializeBackup, type ParseResult } from '@/domain/walletData';
import type { WalletData } from '@/domain/types';

export type ExportResult = 'shared' | 'unavailable';

/** Writes a backup to the cache directory and opens the share sheet (Files, AirDrop, mail…). */
export async function exportBackup(data: WalletData, now = new Date()): Promise<ExportResult> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const file = new File(Paths.cache, `vi-minh-backup-${today(now)}.json`);
  await file.write(serializeBackup(data, now));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
  return 'shared';
}

/** Lets the user pick a backup file and validates it. Returns null if the user cancels. */
export async function pickBackup(): Promise<ParseResult | null> {
  // Any type: JSON files often arrive with a generic MIME type; content validation decides.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const text = await new File(result.assets[0].uri).text();
  return parseBackup(text);
}
