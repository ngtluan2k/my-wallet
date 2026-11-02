import { isValidBalance } from './money';
import type { Transaction, Wallet, WalletKind } from './types';

export const MAX_WALLET_NAME_LENGTH = 40;
export const DEFAULT_WALLET_ID = 'wallet-default';

export const WALLET_KIND_ICONS: Record<WalletKind, string> = {
  cash: 'wallet',
  bank: 'business',
  ewallet: 'phone-portrait',
};

export const WALLET_COLORS = ['#006948', '#0EA5E9', '#8B5CF6', '#EC4899', '#F97316', '#EAB308', '#64748B'];

export function createDefaultWallet(name: string, now: Date): Wallet {
  const timestamp = now.toISOString();
  return {
    id: DEFAULT_WALLET_ID,
    name,
    kind: 'cash',
    icon: WALLET_KIND_ICONS.cash,
    color: WALLET_COLORS[0],
    openingBalance: 0,
    isDefault: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface WalletInput {
  name: string;
  kind: WalletKind;
  color: string;
  openingBalance: number;
  isDefault: boolean;
}

export type WalletError = 'name_required' | 'name_too_long' | 'balance_invalid' | 'name_taken';

export function validateWalletInput(input: WalletInput, wallets: Wallet[], editingId?: string): WalletError[] {
  const errors: WalletError[] = [];
  const name = input.name.trim();
  if (!name) errors.push('name_required');
  else if (name.length > MAX_WALLET_NAME_LENGTH) errors.push('name_too_long');
  else if (wallets.some((w) => w.id !== editingId && !w.archived && w.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
    errors.push('name_taken');
  }
  if (!isValidBalance(input.openingBalance)) errors.push('balance_invalid');
  return errors;
}

/** Ensures exactly one active wallet is the default, preferring `preferredId`. */
function withSingleDefault(wallets: Wallet[], preferredId: string | undefined, timestamp: string): Wallet[] {
  const active = wallets.filter((w) => !w.archived);
  const defaultId =
    (preferredId && active.some((w) => w.id === preferredId) && preferredId) ||
    active.find((w) => w.isDefault)?.id ||
    active[0]?.id;
  return wallets.map((w) => {
    const isDefault = w.id === defaultId;
    return w.isDefault === isDefault ? w : { ...w, isDefault, updatedAt: timestamp };
  });
}

export function addWallet(wallets: Wallet[], input: WalletInput, id: string, now: Date): Wallet[] {
  const timestamp = now.toISOString();
  const wallet: Wallet = {
    id,
    name: input.name.trim(),
    kind: input.kind,
    icon: WALLET_KIND_ICONS[input.kind],
    color: input.color,
    openingBalance: input.openingBalance,
    isDefault: input.isDefault,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return withSingleDefault([...wallets, wallet], input.isDefault ? id : undefined, timestamp);
}

export function editWallet(wallets: Wallet[], id: string, input: WalletInput, now: Date): Wallet[] {
  const timestamp = now.toISOString();
  const next = wallets.map((w) =>
    w.id === id
      ? {
          ...w,
          name: input.name.trim(),
          kind: input.kind,
          icon: WALLET_KIND_ICONS[input.kind],
          color: input.color,
          openingBalance: input.openingBalance,
          isDefault: input.isDefault,
          updatedAt: timestamp,
        }
      : w,
  );
  return withSingleDefault(next, input.isDefault ? id : undefined, timestamp);
}

/** Archiving hides a wallet but keeps its history. The last active wallet can't be archived. */
export function archiveWallet(wallets: Wallet[], id: string, now: Date): Wallet[] {
  const active = wallets.filter((w) => !w.archived);
  if (active.length <= 1 && active[0]?.id === id) throw new Error('last_wallet');
  const timestamp = now.toISOString();
  const next = wallets.map((w) => (w.id === id ? { ...w, archived: true, isDefault: false, updatedAt: timestamp } : w));
  return withSingleDefault(next, undefined, timestamp);
}

export function walletInUse(transactions: Transaction[], id: string): boolean {
  return transactions.some((t) => t.walletId === id || t.toWalletId === id);
}

/** Deleting is only allowed for unused wallets; use archiveWallet otherwise. */
export function deleteWallet(wallets: Wallet[], transactions: Transaction[], id: string, now: Date): Wallet[] {
  if (walletInUse(transactions, id)) throw new Error('wallet_in_use');
  const active = wallets.filter((w) => !w.archived);
  if (active.length <= 1 && active[0]?.id === id) throw new Error('last_wallet');
  return withSingleDefault(wallets.filter((w) => w.id !== id), undefined, now.toISOString());
}

/** Opening balance + income − expense − transfers out + transfers in, over all time. */
export function walletBalance(wallet: Wallet, transactions: Transaction[]): number {
  let balance = wallet.openingBalance;
  for (const t of transactions) {
    if (t.type === 'income' && t.walletId === wallet.id) balance += t.amount;
    else if (t.type === 'expense' && t.walletId === wallet.id) balance -= t.amount;
    else if (t.type === 'transfer') {
      if (t.walletId === wallet.id) balance -= t.amount;
      if (t.toWalletId === wallet.id) balance += t.amount;
    }
  }
  return balance;
}

export function walletBalances(wallets: Wallet[], transactions: Transaction[]): Map<string, number> {
  return new Map(wallets.map((w) => [w.id, walletBalance(w, transactions)]));
}

/** Sum of active wallets' balances. Archived wallets are excluded. */
export function totalBalance(wallets: Wallet[], transactions: Transaction[]): number {
  return wallets.filter((w) => !w.archived).reduce((sum, w) => sum + walletBalance(w, transactions), 0);
}

export function defaultWalletId(wallets: Wallet[]): string | undefined {
  return wallets.find((w) => w.isDefault && !w.archived)?.id ?? wallets.find((w) => !w.archived)?.id;
}

export function activeWallets(wallets: Wallet[]): Wallet[] {
  return wallets.filter((w) => !w.archived);
}
