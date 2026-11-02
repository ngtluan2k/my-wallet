import { addAmount, appendDigits, formatMoney, formatSignedMoney, groupDigits, MAX_AMOUNT, parseAmountInput, removeLastDigit } from '../money';

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

describe('amount entry', () => {
  it('appends numpad keys and caps at MAX_AMOUNT', () => {
    expect(appendDigits(0, '5')).toBe(5);
    expect(appendDigits(15, '000')).toBe(15000);
    expect(appendDigits(0, '000')).toBe(0);
    expect(appendDigits(15, '.')).toBe(15);
    expect(appendDigits(MAX_AMOUNT, '1')).toBe(MAX_AMOUNT);
    expect(removeLastDigit(1234)).toBe(123);
    expect(removeLastDigit(7)).toBe(0);
  });

  it('adds quick amounts instead of appending them', () => {
    expect(addAmount(100, 50_000)).toBe(50_100);
    expect(addAmount(0, 100_000)).toBe(100_000);
    expect(addAmount(MAX_AMOUNT - 1, 500_000)).toBe(MAX_AMOUNT);
  });

  it('formats signed amounts', () => {
    expect(formatSignedMoney(1500, 'vi')).toBe('+1.500 ₫');
    expect(formatSignedMoney(-1500, 'vi')).toBe('−1.500 ₫');
    expect(formatSignedMoney(0, 'en')).toBe('₫0');
  });
});
