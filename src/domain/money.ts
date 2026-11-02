/** MVP supports VND only. Amounts are integers in đồng; never use floats for money. */
export const CURRENCY = 'VND';

/** Upper bound keeps every sum well inside Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT = 999_999_999_999;

export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_AMOUNT;
}

/**
 * Parses user input such as "150.000", "150,000" or "150000" into đồng.
 * Separators are treated as digit grouping, since VND has no decimals.
 */
export function parseAmountInput(text: string): number | null {
  const trimmed = text.trim();
  if (!/^[\d.,\s]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/[.,\s]/g, '');
  if (digits === '') return null;
  const value = Number(digits);
  return isValidAmount(value) ? value : null;
}

/** Groups digits for display while typing, e.g. "1500000" -> "1.500.000". */
export function groupDigits(value: number, separator = '.'): string {
  const sign = value < 0 ? '-' : '';
  const digits = Math.abs(value).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function formatMoney(amount: number, language: 'vi' | 'en'): string {
  return language === 'vi' ? `${groupDigits(amount, '.')} ₫` : `₫${groupDigits(amount, ',')}`;
}

/** Signed form for cash-flow figures: "+1.000 ₫" / "−1.000 ₫". Zero has no sign. */
export function formatSignedMoney(amount: number, language: 'vi' | 'en'): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return sign + formatMoney(Math.abs(amount), language);
}

/** Opening balances may be zero, unlike transaction amounts. */
export function isValidBalance(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0 && amount <= MAX_AMOUNT;
}

/** Adds a quick-entry delta (e.g. +50.000) to the amount being typed, capped at MAX_AMOUNT. */
export function addAmount(current: number, delta: number): number {
  return Math.min(Math.max(current, 0) + delta, MAX_AMOUNT);
}

/** Appends one numpad key ('0'-'9' or '000') to the amount being typed. Ignores keys that would exceed MAX_AMOUNT. */
export function appendDigits(current: number, key: string): number {
  if (!/^\d+$/.test(key)) return current;
  const next = Number(`${Math.max(current, 0)}${key}`);
  return next <= MAX_AMOUNT ? next : current;
}

/** Removes the last digit of the amount being typed. */
export function removeLastDigit(current: number): number {
  return Math.floor(current / 10);
}
