import { addDays } from './dates';
import { summarize, totalsByCategory, type CategoryTotal } from './transactions';
import type { LocalDate, Transaction } from './types';

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
