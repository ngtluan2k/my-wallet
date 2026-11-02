import { useStore } from 'zustand';

import type { Budget, Transaction, Wallet } from '@/domain/types';
import { currentLanguage, translate } from '@/i18n';

import { createWalletStore, type WalletState } from './walletStore';

/**
 * The app's wallet store. Which user's data it holds is decided by `session.ts`, which opens a
 * per-user repository after sign-in and wires committed changes into sync.
 */
export const walletStore = createWalletStore({
  defaultWalletName: () => translate(currentLanguage(), 'wallet.defaultName'),
  onCommitted: (ops) => commitListener?.(ops),
});

type CommitListener = NonNullable<Parameters<typeof createWalletStore>[0]>['onCommitted'];
let commitListener: CommitListener | undefined;

/** Set by the session so committed changes reach the current user's outbox. */
export function setCommitListener(listener: CommitListener | undefined) {
  commitListener = listener;
}

export function useWallet<T>(selector: (state: WalletState) => T): T {
  return useStore(walletStore, selector);
}

// Selectors must return stable references, so empty fallbacks are shared constants.
const NO_TRANSACTIONS: Transaction[] = [];
const NO_BUDGETS: Budget[] = [];
const NO_WALLETS: Wallet[] = [];

export const useTransactions = () => useWallet((s) => s.data?.transactions ?? NO_TRANSACTIONS);
export const useBudgets = () => useWallet((s) => s.data?.budgets ?? NO_BUDGETS);
export const useWallets = () => useWallet((s) => s.data?.wallets ?? NO_WALLETS);
export const useWalletStatus = () => useWallet((s) => s.status);
export const useWalletLoadError = () => useWallet((s) => s.loadError);
