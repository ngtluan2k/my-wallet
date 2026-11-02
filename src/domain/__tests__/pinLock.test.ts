import {
  attemptsExhausted,
  encodeStoredPin,
  lockoutAfter,
  NO_THROTTLE,
  parseStoredPin,
  parseThrottle,
  recordFailure,
} from '../pinLock';

describe('PIN throttling', () => {
  it('waits nothing for the first attempts, then doubles from 30 s up to 15 minutes', () => {
    expect([1, 4].map(lockoutAfter)).toEqual([0, 0]);
    expect([5, 6, 7].map(lockoutAfter)).toEqual([30_000, 60_000, 120_000]);
    expect(lockoutAfter(20)).toBe(15 * 60_000);
  });

  it('records failures with a lockout deadline and gives up at the maximum', () => {
    let state = NO_THROTTLE;
    for (let i = 0; i < 4; i++) state = recordFailure(state, 1000);
    expect(state).toEqual({ failures: 4, lockedUntil: null });
    state = recordFailure(state, 1000);
    expect(state).toEqual({ failures: 5, lockedUntil: 31_000 });
    expect(attemptsExhausted(9)).toBe(false);
    expect(attemptsExhausted(10)).toBe(true);
  });

  it('reads stored throttle state defensively', () => {
    expect(parseThrottle(null)).toEqual(NO_THROTTLE);
    expect(parseThrottle('garbage')).toEqual(NO_THROTTLE);
    expect(parseThrottle('{"failures":-1,"lockedUntil":"x"}')).toEqual(NO_THROTTLE);
    expect(parseThrottle('{"failures":6,"lockedUntil":5}')).toEqual({ failures: 6, lockedUntil: 5 });
  });
});

describe('stored PIN format', () => {
  it('reads hashed and legacy plain PINs', () => {
    expect(parseStoredPin(encodeStoredPin('ab12', 'ff00'))).toEqual({ kind: 'hashed', salt: 'ab12', hash: 'ff00' });
    expect(parseStoredPin('1234')).toEqual({ kind: 'plain', pin: '1234' });
    expect(parseStoredPin('v2:zz')).toBeNull();
    expect(parseStoredPin(null)).toBeNull();
  });
});
