/** Calendar date picked by the user, `YYYY-MM-DD`, in device local time with no timezone. */
export type LocalDate = string;

/** Calendar month, `YYYY-MM`. */
export type MonthKey = string;

/** Local wall-clock time, `HH:mm`. */
export type LocalTime = string;

/** Kinds that carry a category and count toward income/expense totals. */
export type CategoryType = 'income' | 'expense';

/** A transfer moves money between two of the user's wallets and is not income or expense. */
export type TransactionType = CategoryType | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Positive integer of đồng (VND only). */
  amount: number;
  /** Source wallet for every type; for a transfer, the wallet money leaves. */
  walletId: string;
  /** Destination wallet, set only for transfers. */
  toWalletId?: string;
  /** Set for income and expense, absent for transfers. */
  categoryId?: string;
  transactionDate: LocalDate;
  transactionTime?: LocalTime;
  note?: string;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  type: CategoryType;
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

export type WalletKind = 'cash' | 'bank' | 'ewallet';

export interface Wallet {
  id: string;
  name: string;
  kind: WalletKind;
  /** Ionicons glyph name. */
  icon: string;
  color: string;
  /** Đồng held when the wallet was added to the app. Integer, may be 0. */
  openingBalance: number;
  /** Exactly one wallet is the default; new transactions start on it. */
  isDefault: boolean;
  /** Archived wallets keep their history but are hidden from pickers and the total balance. */
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = 'weekly' | 'monthly';

/**
 * A transaction that repeats (rent, salary, subscriptions). Occurrences up to today are created as
 * ordinary transactions with the id `<rule id>@<date>`, so two devices create the same record.
 */
export interface RecurringRule {
  id: string;
  type: CategoryType;
  amount: number;
  walletId: string;
  categoryId: string;
  note?: string;
  frequency: RecurringFrequency;
  /** First occurrence. Its weekday (weekly) or day of month (monthly, clamped to short months) repeats. */
  startDate: LocalDate;
  /** Next occurrence not created yet. */
  nextDate: LocalDate;
  /** Paused rules create nothing; also set automatically when the wallet or category became unusable. */
  paused?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletData {
  version: number;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  wallets: Wallet[];
  recurring: RecurringRule[];
}
