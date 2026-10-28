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

export function setBudget(budgets: Budget[], categoryId: string, limit: number): Budget[] {
  if (!isValidAmount(limit)) throw new Error('amount_invalid');
  const others = budgets.filter((b) => b.categoryId !== categoryId);
  return [...others, { categoryId, limit }];
}

export function removeBudget(budgets: Budget[], categoryId: string): Budget[] {
  return budgets.filter((b) => b.categoryId !== categoryId);
}
