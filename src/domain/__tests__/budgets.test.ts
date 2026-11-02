import { budgetOverview, budgetStatus, budgetUsage, removeBudget, setBudget } from '../budgets';
import type { Transaction } from '../types';

const expense = (categoryId: string, amount: number): Transaction => ({
  id: `${categoryId}-${amount}`,
  type: 'expense',
  amount,
  walletId: 'wallet-default',
  categoryId,
  transactionDate: '2026-10-01',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

describe('budgetStatus', () => {
  it('warns from 80% and flags only when spending exceeds the limit', () => {
    expect(budgetStatus(0, 1000)).toBe('ok');
    expect(budgetStatus(799, 1000)).toBe('ok');
    expect(budgetStatus(800, 1000)).toBe('warning');
    expect(budgetStatus(1000, 1000)).toBe('warning');
    expect(budgetStatus(1001, 1000)).toBe('over');
  });
});

describe('budgetUsage', () => {
  it('computes spent and remaining per budget', () => {
    const usage = budgetUsage(
      [
        { categoryId: 'exp-food', limit: 1_000_000 },
        { categoryId: 'exp-transport', limit: 300_000 },
      ],
      [expense('exp-food', 400_000), expense('exp-food', 450_000), expense('exp-health', 5_000)],
    );
    expect(usage).toEqual([
      { categoryId: 'exp-food', limit: 1_000_000, spent: 850_000, remaining: 150_000, status: 'warning' },
      { categoryId: 'exp-transport', limit: 300_000, spent: 0, remaining: 300_000, status: 'ok' },
    ]);
  });
});

describe('setBudget/removeBudget', () => {
  it('replaces an existing budget for the same category', () => {
    const budgets = setBudget(setBudget([], 'exp-food', 100), 'exp-food', 200);
    expect(budgets).toEqual([{ categoryId: 'exp-food', limit: 200 }]);
    expect(removeBudget(budgets, 'exp-food')).toEqual([]);
  });

  it('rejects invalid limits', () => {
    expect(() => setBudget([], 'exp-food', 0)).toThrow('amount_invalid');
  });
});

describe('budgetOverview', () => {
  const budgets = [
    { categoryId: 'exp-food', limit: 3_000_000 },
    { categoryId: 'exp-transport', limit: 1_000_000 },
  ];
  const spending = [expense('exp-food', 1_500_000), expense('exp-transport', 500_000), expense('exp-health', 9_999)];

  it('totals limits and spending in budgeted categories, with days left in the current month', () => {
    expect(budgetOverview(budgets, spending, '2026-10', '2026-10-22')).toEqual({
      limit: 4_000_000,
      spent: 2_000_000,
      remaining: 2_000_000,
      percent: 50,
      status: 'ok',
      daysLeft: 10,
      dailyAllowance: 200_000,
    });
  });

  it('has no daily allowance outside the current month and never suggests a negative one', () => {
    expect(budgetOverview(budgets, spending, '2026-09', '2026-10-22')).toMatchObject({ daysLeft: null, dailyAllowance: null });
    const over = budgetOverview(budgets, [expense('exp-food', 5_000_000)], '2026-10', '2026-10-31');
    expect(over).toMatchObject({ remaining: -1_000_000, status: 'over', daysLeft: 1, dailyAllowance: 0 });
  });

  it('handles no budgets', () => {
    expect(budgetOverview([], spending, '2026-10', '2026-10-01')).toMatchObject({ limit: 0, percent: 0, status: 'ok' });
  });
});
