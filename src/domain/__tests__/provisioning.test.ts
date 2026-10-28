import { daysUntil, parseProvisionExpiry } from '../provisioning';

const profile = (date: string) =>
  `0\u0082binary-prefix<?xml version="1.0"?><plist><dict>
  <key>CreationDate</key>
  <date>2026-10-28T06:00:00Z</date>
  <key>ExpirationDate</key>
  <date>${date}</date>
</dict></plist> binary-suffix`;

describe('parseProvisionExpiry', () => {
  it('reads ExpirationDate, not other dates', () => {
    expect(parseProvisionExpiry(profile('2026-11-04T06:00:00Z'))?.toISOString()).toBe('2026-11-04T06:00:00.000Z');
  });

  it('returns null when missing or invalid', () => {
    expect(parseProvisionExpiry('no plist here')).toBeNull();
    expect(parseProvisionExpiry(profile('not a date'))).toBeNull();
  });
});

describe('daysUntil', () => {
  const expiry = new Date('2026-11-04T06:00:00Z');
  it('rounds down to whole days', () => {
    expect(daysUntil(expiry, new Date('2026-10-28T06:00:00Z'))).toBe(7);
    expect(daysUntil(expiry, new Date('2026-11-02T07:00:00Z'))).toBe(1);
    expect(daysUntil(expiry, new Date('2026-11-04T05:00:00Z'))).toBe(0);
    expect(daysUntil(expiry, new Date('2026-11-05T06:00:00Z'))).toBe(-1);
  });
});
