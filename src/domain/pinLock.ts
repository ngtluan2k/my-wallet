/**
 * App-lock PIN rules: how a stored PIN is encoded, and how wrong attempts are throttled.
 * Pure functions; hashing itself happens in the state layer (expo-crypto).
 */

/** Wrong PINs allowed before any waiting. */
export const FREE_PIN_ATTEMPTS = 5;
/** After this many consecutive wrong PINs the lock is removed and the user is signed out. */
export const MAX_PIN_ATTEMPTS = 10;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

/**
 * How long to wait after `failures` consecutive wrong PINs: nothing for the first few, then
 * 30 s, doubling each time, capped at 15 minutes.
 */
export function lockoutAfter(failures: number): number {
  if (failures < FREE_PIN_ATTEMPTS) return 0;
  return Math.min(BASE_LOCKOUT_MS * 2 ** (failures - FREE_PIN_ATTEMPTS), MAX_LOCKOUT_MS);
}

export function attemptsExhausted(failures: number): boolean {
  return failures >= MAX_PIN_ATTEMPTS;
}

/** Wrong-attempt state kept in secure storage, so restarting the app doesn't reset it. */
export interface PinThrottle {
  failures: number;
  /** Epoch ms; no attempt is accepted before this. */
  lockedUntil: number | null;
}

export const NO_THROTTLE: PinThrottle = { failures: 0, lockedUntil: null };

export function recordFailure(state: PinThrottle, now: number): PinThrottle {
  const failures = state.failures + 1;
  const wait = lockoutAfter(failures);
  return { failures, lockedUntil: wait > 0 ? now + wait : null };
}

export function parseThrottle(raw: string | null): PinThrottle {
  if (!raw) return NO_THROTTLE;
  try {
    const value = JSON.parse(raw) as Partial<PinThrottle>;
    const failures = Number.isInteger(value.failures) && value.failures! >= 0 ? value.failures! : 0;
    const lockedUntil = typeof value.lockedUntil === 'number' ? value.lockedUntil : null;
    return { failures, lockedUntil };
  } catch {
    return NO_THROTTLE;
  }
}

/** Stored PIN: `v1:<salt>:<sha256(salt:pin)>`. Older builds stored the 4 digits as-is. */
export type StoredPin = { kind: 'hashed'; salt: string; hash: string } | { kind: 'plain'; pin: string };

export function encodeStoredPin(salt: string, hash: string): string {
  return `v1:${salt}:${hash}`;
}

export function parseStoredPin(raw: string | null): StoredPin | null {
  if (!raw) return null;
  const match = /^v1:([0-9a-f]+):([0-9a-f]+)$/.exec(raw);
  if (match) return { kind: 'hashed', salt: match[1], hash: match[2] };
  return /^\d+$/.test(raw) ? { kind: 'plain', pin: raw } : null;
}

export function pinHashInput(salt: string, pin: string): string {
  return `${salt}:${pin}`;
}
