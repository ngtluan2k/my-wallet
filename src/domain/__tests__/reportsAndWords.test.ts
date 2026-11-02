import { startOfWeek } from '../dates';
import { vietnameseAmountWords, vietnameseNumberWords } from '../numberWords';
import { monthlyReport, weeklyReport } from '../reports';
import type { Transaction } from '../types';

const tx = (date: string, type: Transaction['type'], amount: number, categoryId?: string): Transaction => ({
  id: `${date}-${amount}`,
  type,
  amount,
  walletId: 'wallet-default',
  ...(type === 'transfer' ? { toWalletId: 'bank' } : { categoryId }),
  transactionDate: date,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    expect(startOfWeek('2026-10-28')).toBe('2026-10-26'); // Wednesday
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26'); // Monday
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26'); // Sunday
  });
});

describe('weeklyReport', () => {
  const txs = [
    tx('2026-10-19', 'expense', 100_000, 'exp-food'), // previous week
    tx('2026-10-26', 'expense', 50_000, 'exp-food'),
    tx('2026-10-27', 'expense', 70_000, 'exp-transport'),
    tx('2026-10-27', 'income', 1_000_000, 'inc-salary'),
    tx('2026-10-28', 'transfer', 500_000),
    tx('2026-11-01', 'expense', 30_000, 'exp-food'),
    tx('2026-11-02', 'expense', 999_999, 'exp-food'), // next week
  ];

  it('totals the Monday–Sunday week by day, excluding transfers', () => {
    const report = weeklyReport(txs, '2026-10-26');
    expect(report.start).toBe('2026-10-26');
    expect(report.end).toBe('2026-11-01');
    expect(report.income).toBe(1_000_000);
    expect(report.expense).toBe(150_000);
    expect(report.days.map((d) => d.expense)).toEqual([50_000, 70_000, 0, 0, 0, 0, 30_000]);
    expect(report.topCategories).toEqual([
      { categoryId: 'exp-food', amount: 80_000 },
      { categoryId: 'exp-transport', amount: 70_000 },
    ]);
    expect(report.previousExpense).toBe(100_000);
    expect(report.expenseChangePercent).toBe(50);
  });

  it('has no change percent when the previous week had no spending', () => {
    expect(weeklyReport(txs, '2026-10-12').expenseChangePercent).toBeNull();
  });
});

describe('vietnameseNumberWords', () => {
  it.each([
    [0, 'không'],
    [5, 'năm'],
    [10, 'mười'],
    [15, 'mười lăm'],
    [21, 'hai mươi mốt'],
    [24, 'hai mươi tư'],
    [55, 'năm mươi lăm'],
    [105, 'một trăm lẻ năm'],
    [110, 'một trăm mười'],
    [150_000, 'một trăm năm mươi nghìn'],
    [1_005_000, 'một triệu không trăm lẻ năm nghìn'],
    [2_000_000_000, 'hai tỷ'],
    [999_999_999_999, 'chín trăm chín mươi chín tỷ chín trăm chín mươi chín triệu chín trăm chín mươi chín nghìn chín trăm chín mươi chín'],
  ])('reads %p', (value, words) => {
    expect(vietnameseNumberWords(value)).toBe(words);
  });

  it('formats amounts with a capital letter and đồng', () => {
    expect(vietnameseAmountWords(150_000)).toBe('Một trăm năm mươi nghìn đồng');
    expect(vietnameseAmountWords(-1)).toBe('');
  });
});

describe('monthlyReport', () => {
  const txs = [
    tx('2026-09-10', 'expense', 400_000, 'exp-food'),
    tx('2026-10-01', 'income', 10_000_000, 'inc-salary'),
    tx('2026-10-05', 'expense', 300_000, 'exp-food'),
    tx('2026-10-20', 'expense', 200_000, 'exp-transport'),
    tx('2026-10-21', 'transfer', 5_000_000),
    tx('2026-11-01', 'expense', 50_000, 'exp-food'),
  ];

  it('sums the month, ranks categories and compares with the previous month', () => {
    const report = monthlyReport(txs, '2026-10', 5, 3);
    expect(report).toMatchObject({ month: '2026-10', income: 10_000_000, expense: 500_000, savingsRate: 95 });
    expect(report.topCategories.map((c) => c.categoryId)).toEqual(['exp-food', 'exp-transport']);
    expect(report.previousExpense).toBe(400_000);
    expect(report.expenseChangePercent).toBe(25);
    expect(report.trend).toEqual([
      { month: '2026-08', income: 0, expense: 0 },
      { month: '2026-09', income: 0, expense: 400_000 },
      { month: '2026-10', income: 10_000_000, expense: 500_000 },
    ]);
  });

  it('has no savings rate or change without a baseline', () => {
    const report = monthlyReport(txs, '2026-09');
    expect(report.savingsRate).toBeNull();
    expect(report.expenseChangePercent).toBeNull();
  });
});
