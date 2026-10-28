// Sideloaded builds (free Apple ID) embed a provisioning profile that expires after 7 days;
// once it does, iOS refuses to launch the app. Reading its expiry lets the app warn in advance.

/** Show the reminder banner when this many days or fewer remain. */
export const RESIGN_WARNING_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Extracts ExpirationDate from the contents of `embedded.mobileprovision`. The file is a signed
 * container, but the plist inside is plain XML, so a text search is enough.
 */
export function parseProvisionExpiry(contents: string): Date | null {
  const match = /<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/.exec(contents);
  if (!match) return null;
  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days left, rounded down; 0 on the last day, negative once expired. */
export function daysUntil(expiry: Date, now: Date): number {
  return Math.floor((expiry.getTime() - now.getTime()) / DAY_MS);
}
