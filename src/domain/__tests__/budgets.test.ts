import { budgetStatus, budgetUsage, removeBudget, setBudget } from '../budgets';
import type { Transaction } from '../types';

const expense = (categoryId: string, amount: number): Transaction => ({
  id: `${categoryId}-${amount}`,
  type: 'expense',
  amount,
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
