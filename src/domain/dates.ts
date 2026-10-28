import type { LocalDate, MonthKey } from './types';

// Transaction dates are calendar strings, not instants: the day the user picked on their device.
// Monthly reports group by the string prefix, so changing timezone never moves a transaction.

const pad = (n: number) => n.toString().padStart(2, '0');

export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(now: Date = new Date()): LocalDate {
  return toLocalDate(now);
}

export function isValidLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function parseLocalDate(value: LocalDate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}

export function monthOf(value: LocalDate): MonthKey {
  return value.slice(0, 7);
}

export function addMonths(month: MonthKey, months: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + months, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function formatLocalDate(value: LocalDate, language: 'vi' | 'en'): string {
  const [y, m, d] = value.split('-');
  return language === 'vi' ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}

export function formatMonth(month: MonthKey, language: 'vi' | 'en'): string {
  const [y, m] = month.split('-');
  return language === 'vi' ? `Tháng ${Number(m)}/${y}` : `${m}/${y}`;
}
