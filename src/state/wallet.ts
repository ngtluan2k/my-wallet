import { useStore } from 'zustand';

import { JsonFileRepository } from '@/data/jsonFileRepository';
import type { Budget, Transaction } from '@/domain/types';

import { createWalletStore, type WalletState } from './walletStore';

export const walletStore = createWalletStore({ repository: new JsonFileRepository() });

export function useWallet<T>(selector: (state: WalletState) => T): T {
  return useStore(walletStore, selector);
}

// Selectors must return stable references, so empty fallbacks are shared constants.
const NO_TRANSACTIONS: Transaction[] = [];
const NO_BUDGETS: Budget[] = [];

export const useTransactions = () => useWallet((s) => s.data?.transactions ?? NO_TRANSACTIONS);
export const useBudgets = () => useWallet((s) => s.data?.budgets ?? NO_BUDGETS);
