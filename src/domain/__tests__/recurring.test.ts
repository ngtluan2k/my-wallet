import {
  createRecurringRule,
  generateDueTransactions,
  nextOccurrence,
  occurrenceId,
  updateRecurringRule,
  validateRecurringInput,
  type RecurringInput,
} from '../recurring';
import { createInitialData, parseWalletData } from '../walletData';

const now = new Date('2026-11-02T03:00:00Z');
const base = createInitialData('Ví chính', now);
const rent: RecurringInput = {
  type: 'expense',
  amount: 4_000_000,
  walletId: 'wallet-default',
  categoryId: 'exp-housing',
  note: 'Tiền nhà',
  frequency: 'monthly',
  startDate: '2026-01-31',
};

describe('nextOccurrence', () => {
  it('keeps the start day each month, clamped to short months', () => {
    expect(nextOccurrence('monthly', '2026-01-31', '2026-01-31')).toBe('2026-02-28');
    expect(nextOccurrence('monthly', '2026-01-31', '2026-02-28')).toBe('2026-03-31');
    expect(nextOccurrence('monthly', '2026-01-15', '2026-12-15')).toBe('2027-01-15');
  });

  it('adds a week', () => {
    expect(nextOccurrence('weekly', '2026-10-26', '2026-10-26')).toBe('2026-11-02');
  });
});

describe('generateDueTransactions', () => {
  it('creates every due occurrence once, with deterministic ids, and advances the rule', () => {
    const rule = createRecurringRule(rent, 'r1', now);
    const data = { ...base, recurring: [rule] };
    const result = generateDueTransactions(data, '2026-04-15', now);
    expect(result.transactions.map((t) => t.transactionDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(result.transactions[0]).toMatchObject({ id: occurrenceId('r1', '2026-01-31'), amount: 4_000_000, note: 'Tiền nhà' });
    expect(result.recurring[0].nextDate).toBe('2026-04-30');
    expect(parseWalletData(result).ok).toBe(true);

    // Running again the same day changes nothing; the same object comes back.
    expect(generateDueTransactions(result, '2026-04-15', now)).toBe(result);
  });

  it("doesn't duplicate an occurrence another device already created", () => {
    const rule = createRecurringRule({ ...rent, startDate: '2026-10-31' }, 'r1', now);
    const first = generateDueTransactions({ ...base, recurring: [rule] }, '2026-11-02', now);
    // Same transaction arrives via sync, but this device's rule wasn't advanced yet.
    const second = generateDueTransactions({ ...first, recurring: [rule] }, '2026-11-02', now);
    expect(second.transactions).toHaveLength(1);
  });

  it('pauses a rule whose wallet can no longer be used instead of skipping dates', () => {
    const rule = createRecurringRule({ ...rent, startDate: '2026-10-01' }, 'r1', now);
    const archived = { ...base, wallets: [...base.wallets.map((w) => ({ ...w, isDefault: false, archived: true })), { ...base.wallets[0], id: 'w2' }], recurring: [rule] };
    const result = generateDueTransactions(archived, '2026-11-02', now);
    expect(result.transactions).toEqual([]);
    expect(result.recurring[0]).toMatchObject({ paused: true, nextDate: '2026-10-01' });
  });

  it('skips paused rules and future rules', () => {
    const paused = { ...createRecurringRule(rent, 'r1', now), paused: true };
    const future = createRecurringRule({ ...rent, startDate: '2026-12-01' }, 'r2', now);
    const data = { ...base, recurring: [paused, future] };
    expect(generateDueTransactions(data, '2026-11-02', now)).toBe(data);
  });
});

describe('recurring rules', () => {
  it('validates like a transaction', () => {
    expect(validateRecurringInput({ ...rent, amount: 0 }, base)).toContain('amount_invalid');
    expect(validateRecurringInput({ ...rent, categoryId: 'inc-salary' }, base)).toContain('category_type_mismatch');
    expect(validateRecurringInput(rent, base)).toEqual([]);
  });

  it('restarts the schedule only when it changes', () => {
    const rule = { ...createRecurringRule(rent, 'r1', now), nextDate: '2026-11-30' };
    expect(updateRecurringRule(rule, { ...rent, amount: 1 }, now).nextDate).toBe('2026-11-30');
    expect(updateRecurringRule(rule, { ...rent, frequency: 'weekly', startDate: '2026-11-02' }, now).nextDate).toBe('2026-11-02');
  });

  it('migrates v2 data to v3 with no rules', () => {
    const { recurring: _drop, ...v2 } = base;
    const parsed = parseWalletData({ ...v2, version: 2 });
    expect(parsed.ok && parsed.data.recurring).toEqual([]);
  });
});
