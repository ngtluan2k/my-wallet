/** Calendar date picked by the user, `YYYY-MM-DD`, in device local time with no timezone. */
export type LocalDate = string;

/** Calendar month, `YYYY-MM`. */
export type MonthKey = string;

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Positive integer in the currency's smallest unit (VND has no subunit, so đồng). */
  amount: number;
  categoryId: string;
  transactionDate: LocalDate;
  note?: string;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  type: TransactionType;
  /** Set for built-in categories; the display name comes from translations. */
  builtInKey?: string;
  /** Display name for user-created categories. */
  name?: string;
  /** Ionicons glyph name. */
  icon: string;
  color: string;
}

/** Monthly spending limit for one expense category, applied to every month. */
export interface Budget {
  categoryId: string;
  limit: number;
}

export interface WalletData {
  version: number;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}
