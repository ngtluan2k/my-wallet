import { addDays, addMonths } from './dates';
import { summarize, totalsByCategory, type CategoryTotal } from './transactions';
import type { LocalDate, MonthKey, Transaction } from './types';

export interface DayTotal {
  date: LocalDate;
  income: number;
  expense: number;
}

export interface WeeklyReport {
  /** Monday. */
  start: LocalDate;
  /** Sunday. */
  end: LocalDate;
  income: number;
  expense: number;
  /** Seven entries, Monday first. */
  days: DayTotal[];
  topCategories: CategoryTotal[];
  previousExpense: number;
  /** Whole-percent change of expense vs the previous week; null when last week had none. */
  expenseChangePercent: number | null;
}

function inRange(t: Transaction, start: LocalDate, end: LocalDate) {
  return t.transactionDate >= start && t.transactionDate <= end;
}

/** `weekStart` must be a Monday (see `startOfWeek`). Transfers are excluded. */
export function weeklyReport(transactions: Transaction[], weekStart: LocalDate, topCount = 5): WeeklyReport {
  const end = addDays(weekStart, 6);
  const week = transactions.filter((t) => inRange(t, weekStart, end));
  const previous = transactions.filter((t) => inRange(t, addDays(weekStart, -7), addDays(weekStart, -1)));

  const days: DayTotal[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const { income, expense } = summarize(week.filter((t) => t.transactionDate === date));
    return { date, income, expense };
  });

  const { income, expense } = summarize(week);
  const previousExpense = summarize(previous).expense;
  return {
    start: weekStart,
    end,
    income,
    expense,
    days,
    topCategories: totalsByCategory(week, 'expense').slice(0, topCount),
    previousExpense,
    expenseChangePercent: previousExpense > 0 ? Math.round(((expense - previousExpense) * 100) / previousExpense) : null,
  };
}

export interface MonthTotal {
  month: MonthKey;
  income: number;
  expense: number;
}

export interface MonthlyReport {
  month: MonthKey;
  income: number;
  expense: number;
  /** Share of income left after expenses, in whole percent; null without income. Can be negative. */
  savingsRate: number | null;
  topCategories: CategoryTotal[];
  previousExpense: number;
  /** Whole-percent change of expense vs the previous month; null when last month had none. */
  expenseChangePercent: number | null;
  /** The last `trendMonths` months ending with `month`, oldest first. */
  trend: MonthTotal[];
}

/** Transfers are excluded. */
export function monthlyReport(transactions: Transaction[], month: MonthKey, topCount = 5, trendMonths = 6): MonthlyReport {
  const byMonth = (m: MonthKey) => transactions.filter((t) => t.transactionDate.startsWith(m));
  const current = byMonth(month);
  const { income, expense } = summarize(current);
  const previousExpense = summarize(byMonth(addMonths(month, -1))).expense;
  const trend = Array.from({ length: trendMonths }, (_, i) => {
    const m = addMonths(month, i - trendMonths + 1);
    const totals = summarize(byMonth(m));
    return { month: m, income: totals.income, expense: totals.expense };
  });
  return {
    month,
    income,
    expense,
    savingsRate: income > 0 ? Math.round(((income - expense) * 100) / income) : null,
    topCategories: totalsByCategory(current, 'expense').slice(0, topCount),
    previousExpense,
    expenseChangePercent: previousExpense > 0 ? Math.round(((expense - previousExpense) * 100) / previousExpense) : null,
    trend,
  };
}
