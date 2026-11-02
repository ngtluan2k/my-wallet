import { sortTransactions } from './transactions';
import type { Category, Transaction, Wallet } from './types';

export interface CsvLabels {
  headers: [date: string, time: string, type: string, amount: string, category: string, wallet: string, toWallet: string, note: string];
  type: Record<Transaction['type'], string>;
  categoryName(category: Category | undefined): string;
}

/** Quotes a field when it contains a delimiter, quote or line break (RFC 4180). */
function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** User text that a spreadsheet would run as a formula ("=…", "+…", "-…", "@…") is prefixed with '. */
function text(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Transactions as CSV for spreadsheets, newest first. Amounts are plain integers of đồng (signed:
 * expenses negative, transfers unsigned) so they sum correctly. Starts with a UTF-8 BOM so Excel
 * shows Vietnamese text correctly, and uses CRLF line endings.
 */
export function transactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
  labels: CsvLabels,
): string {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const walletName = (id: string | undefined) => (id ? (wallets.find((w) => w.id === id)?.name ?? '') : '');
  const rows = sortTransactions(transactions).map((t) => {
    const signed = t.type === 'expense' ? -t.amount : t.amount;
    return [
      t.transactionDate,
      t.transactionTime ?? '',
      labels.type[t.type],
      String(signed),
      t.type === 'transfer' ? '' : text(labels.categoryName(categoryById.get(t.categoryId ?? ''))),
      text(walletName(t.walletId)),
      text(walletName(t.toWalletId)),
      text(t.note ?? ''),
    ];
  });
  return '﻿' + [labels.headers, ...rows].map((r) => r.map(field).join(',')).join('\r\n') + '\r\n';
}
