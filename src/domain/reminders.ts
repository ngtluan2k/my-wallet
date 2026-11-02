import { toLocalDate } from './dates';
import { isRecurringOccurrence } from './recurring';
import type { LocalDate, Transaction } from './types';

/**
 * Reminders are scheduled one per day for this many days ahead (iOS keeps at most 64 pending local
 * notifications per app). The window rolls forward whenever the app is opened.
 */
export const REMINDER_WINDOW_DAYS = 30;

/** Whether the user logged anything on `date` (device local), ignoring recurring occurrences. */
export function loggedOn(transactions: Transaction[], date: LocalDate): boolean {
  return transactions.some((t) => !isRecurringOccurrence(t.id) && toLocalDate(new Date(t.createdAt)) === date);
}

/**
 * When to remind: at `time` (`HH:mm`) on each of the next `days` days. Today is included only if
 * the time hasn't passed yet and the user hasn't logged anything today.
 */
export function reminderTimes(now: Date, time: string, skipToday: boolean, days = REMINDER_WINDOW_DAYS): Date[] {
  const [hour, minute] = time.split(':').map(Number);
  const result: Date[] = [];
  for (let offset = 0; offset < days; offset++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute, 0, 0);
    if (offset === 0 && (skipToday || at <= now)) continue;
    result.push(at);
  }
  return result;
}
