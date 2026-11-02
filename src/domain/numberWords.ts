const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];

/** Reads a three-digit group. `full` forces "không trăm"/"lẻ" when a larger group precedes it. */
function readGroup(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const words: string[] = [];

  if (h > 0 || full) words.push(DIGITS[h], 'trăm');

  if (t === 0) {
    if (o > 0 && words.length) words.push('lẻ');
  } else if (t === 1) {
    words.push('mười');
  } else {
    words.push(DIGITS[t], 'mươi');
  }

  if (o > 0) {
    if (o === 1 && t > 1) words.push('mốt');
    else if (o === 5 && t > 0) words.push('lăm');
    else if (o === 4 && t > 1) words.push('tư');
    else words.push(DIGITS[o]);
  }
  return words.join(' ');
}

/** Vietnamese reading of a non-negative integer, e.g. 150000 → "một trăm năm mươi nghìn". */
export function vietnameseNumberWords(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) return '';
  if (value === 0) return DIGITS[0];

  const groups: number[] = [];
  for (let n = value; n > 0; n = Math.floor(n / 1000)) groups.push(n % 1000);

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const hasHigher = i < groups.length - 1;
    parts.push(readGroup(g, hasHigher));
    if (SCALES[i]) parts.push(SCALES[i]);
  }
  return parts.join(' ');
}

/** "Một trăm năm mươi nghìn đồng". */
export function vietnameseAmountWords(amount: number): string {
  const words = vietnameseNumberWords(amount);
  return words ? `${words.charAt(0).toLocaleUpperCase('vi')}${words.slice(1)} đồng` : '';
}
