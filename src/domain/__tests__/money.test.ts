import { formatMoney, groupDigits, MAX_AMOUNT, parseAmountInput } from '../money';

describe('parseAmountInput', () => {
  it.each([
    ['150000', 150000],
    ['150.000', 150000],
    ['150,000', 150000],
    [' 1 500 000 ', 1500000],
  ])('parses %p', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5000', '0', '12a', '1e5'])('rejects %p', (input) => {
    expect(parseAmountInput(input)).toBeNull();
  });

  it('rejects amounts above the maximum', () => {
    expect(parseAmountInput(String(MAX_AMOUNT))).toBe(MAX_AMOUNT);
    expect(parseAmountInput(String(MAX_AMOUNT + 1))).toBeNull();
  });
});

describe('formatting', () => {
  it('groups digits', () => {
    expect(groupDigits(0)).toBe('0');
    expect(groupDigits(999)).toBe('999');
    expect(groupDigits(1000)).toBe('1.000');
    expect(groupDigits(-1234567)).toBe('-1.234.567');
  });

  it('formats per language', () => {
    expect(formatMoney(1500000, 'vi')).toBe('1.500.000 ₫');
    expect(formatMoney(1500000, 'en')).toBe('₫1,500,000');
  });
});
