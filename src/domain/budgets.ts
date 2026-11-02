import { daysInMonth } from './dates';
import { isValidAmount } from './money';
import { totalsByCategory } from './transactions';
import type { Budget, Transaction } from './types';

/** Usage at or above this share of the limit shows a warning. Kept as a fraction to compare in integers. */
const WARNING_NUMERATOR = 4;
const WARNING_DENOMINATOR = 5;

export type BudgetStatus = 'ok' | 'warning' | 'over';

export interface BudgetUsage {
  categoryId: string;
  limit: number;
  spent: number;
  remaining: number;
  status: BudgetStatus;
}

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return 'over';
  if (spent * WARNING_DENOMINATOR >= limit * WARNING_NUMERATOR) return 'warning';
  return 'ok';
}

/** `monthTransactions` must already be limited to the month being reported. */
export function budgetUsage(budgets: Budget[], monthTransactions: Transaction[]): BudgetUsage[] {
  const spentByCategory = new Map(
    totalsByCategory(monthTransactions, 'expense').map((t) => [t.categoryId, t.amount] as const),
  );
  return budgets.map((b) => {
    const spent = spentByCategory.get(b.categoryId) ?? 0;
    return { categoryId: b.categoryId, limit: b.limit, spent, remaining: b.limit - spent, status: budgetStatus(spent, b.limit) };
  });
}

export interface BudgetOverview {
  /** Sum of all category limits. */
  limit: number;
  /** Spending in budgeted categories this month. */
  spent: number;
  /** limit − spent; negative when over. */
  remaining: number;
  /** Whole percent of the limit used, 0 when there is no limit. */
  percent: number;
  status: BudgetStatus;
  /** Days left including today, only for the current month. */
  daysLeft: number | null;
  /** Suggested maximum spend per day for the rest of the month, only for the current month. */
  dailyAllowance: number | null;
}

/**
 * Totals across every budgeted category for one month. `todayDate` decides whether the month is
 * current: past and future months get no days-left or daily allowance.
 */
export function budgetOverview(budgets: Budget[], monthTransactions: Transaction[], month: string, todayDate: string): BudgetOverview {
  const usage = budgetUsage(budgets, monthTransactions);
  const limit = usage.reduce((s, u) => s + u.limit, 0);
  const spent = usage.reduce((s, u) => s + u.spent, 0);
  const remaining = limit - spent;
  const current = todayDate.slice(0, 7) === month;
  const daysLeft = current ? daysInMonth(month) - Number(todayDate.slice(8, 10)) + 1 : null;
  return {
    limit,
    spent,
    remaining,
    percent: limit > 0 ? Math.floor((spent * 100) / limit) : 0,
    status: limit > 0 ? budgetStatus(spent, limit) : 'ok',
    daysLeft,
    dailyAllowance: daysLeft ? Math.max(0, Math.floor(remaining / daysLeft)) : null,
  };
}

/** Whole percent of the limit used. */
export function usagePercent(spent: number, limit: number): number {
  return limit > 0 ? Math.floor((spent * 100) / limit) : 0;
}

export function setBudget(budgets: Budget[], categoryId: string, limit: number): Budget[] {
  if (!isValidAmount(limit)) throw new Error('amount_invalid');
  const others = budgets.filter((b) => b.categoryId !== categoryId);
  return [...others, { categoryId, limit }];
}

export function removeBudget(budgets: Budget[], categoryId: string): Budget[] {
  return budgets.filter((b) => b.categoryId !== categoryId);
}
