const mockKeychain = new Map<string, string>();

type NodeCrypto = {
  createHash(algorithm: string): { update(data: string): { digest(encoding: string): string } };
  randomBytes(size: number): Uint8Array;
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockKeychain.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockKeychain.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockKeychain.delete(key)),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_alg: string, data: string) =>
    jest.requireActual<NodeCrypto>('crypto').createHash('sha256').update(data).digest('hex'),
  ),
  getRandomBytes: jest.fn((n: number) => new Uint8Array(jest.requireActual<NodeCrypto>('crypto').randomBytes(n))),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

// eslint-disable-next-line import/first
import { useAppLock } from '../appLock';

const store = () => useAppLock.getState();

beforeEach(async () => {
  mockKeychain.clear();
  jest.useRealTimers();
  await store().load();
});

describe('app lock', () => {
  it('stores only a salted hash and unlocks with the right PIN', async () => {
    await store().setPin('2468');
    const stored = mockKeychain.get('app-lock-pin')!;
    expect(stored).toMatch(/^v1:[0-9a-f]{32}:[0-9a-f]{64}$/);
    expect(stored).not.toContain('2468');

    useAppLock.setState({ locked: true });
    expect(await store().unlockWithPin('1111')).toBe('wrong');
    expect(await store().unlockWithPin('2468')).toBe('ok');
    expect(store()).toMatchObject({ locked: false, failures: 0 });
  });

  it('upgrades a PIN stored in plain text by older builds', async () => {
    mockKeychain.set('app-lock-pin', '1357');
    await store().load();
    expect(mockKeychain.get('app-lock-pin')).toMatch(/^v1:/);
    expect(await store().unlockWithPin('1357')).toBe('ok');
  });

  it('throttles wrong attempts, survives a restart, and gives up after ten', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-11-02T08:00:00Z') });
    await store().setPin('2468');
    for (let i = 0; i < 4; i++) expect(await store().unlockWithPin('0000')).toBe('wrong');
    expect(store().lockedUntil).toBeNull();
    expect(await store().unlockWithPin('0000')).toBe('wrong'); // 5th: 30 s lockout
    expect(await store().unlockWithPin('2468')).toBe('wait'); // even the right PIN waits

    await store().load(); // app restarted: the throttle is still there
    expect(store().failures).toBe(5);

    for (let i = 5; i < 9; i++) {
      jest.setSystemTime(store().lockedUntil! + 1);
      expect(await store().unlockWithPin('0000')).toBe('wrong');
    }
    jest.setSystemTime(store().lockedUntil! + 1);
    expect(await store().unlockWithPin('0000')).toBe('exhausted');
    expect(store()).toMatchObject({ pinSet: false, locked: false, failures: 0 });
    expect(mockKeychain.size).toBe(0);
  });
});
