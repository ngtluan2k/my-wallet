import { loggedOn, reminderTimes } from '../reminders';
import type { Transaction } from '../types';

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('reminderTimes', () => {
  it('starts today when the time is still ahead and nothing was logged', () => {
    const times = reminderTimes(local(2026, 11, 2, 9, 0), '21:00', false, 3);
    expect(times).toEqual([local(2026, 11, 2, 21), local(2026, 11, 3, 21), local(2026, 11, 4, 21)]);
  });

  it('skips today once logged or once the time has passed', () => {
    expect(reminderTimes(local(2026, 11, 2, 9, 0), '21:00', true, 3)[0]).toEqual(local(2026, 11, 3, 21));
    expect(reminderTimes(local(2026, 11, 2, 21, 30), '21:00', false, 3)[0]).toEqual(local(2026, 11, 3, 21));
  });

  it('crosses month ends', () => {
    expect(reminderTimes(local(2026, 11, 30, 22), '20:15', false, 2)).toEqual([local(2026, 12, 1, 20, 15)]);
  });
});

describe('loggedOn', () => {
  const tx = (id: string, createdAt: Date): Transaction => ({
    id,
    type: 'expense',
    amount: 1,
    walletId: 'w',
    categoryId: 'exp-food',
    transactionDate: '2026-10-01',
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  });

  it('counts what the user entered today, by creation time, not recurring occurrences', () => {
    const today = '2026-11-02';
    expect(loggedOn([tx('a', local(2026, 11, 2, 8))], today)).toBe(true); // dated in October, entered today
    expect(loggedOn([tx('a', local(2026, 11, 1, 23))], today)).toBe(false);
    expect(loggedOn([tx('rule@2026-11-02', local(2026, 11, 2, 8))], today)).toBe(false);
  });
});
