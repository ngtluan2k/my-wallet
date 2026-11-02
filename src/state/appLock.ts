import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { create } from 'zustand';

import {
  attemptsExhausted,
  encodeStoredPin,
  NO_THROTTLE,
  parseStoredPin,
  parseThrottle,
  pinHashInput,
  recordFailure,
  type PinThrottle,
} from '@/domain/pinLock';

/**
 * Optional local app lock. A 4-digit PIN turns the lock on; Face ID / Touch ID is an extra way to
 * unlock and needs the PIN as a fallback. Both are off by default. Everything lives in the iOS
 * Keychain via SecureStore: the PIN only as a salted SHA-256 hash, plus the wrong-attempt counter
 * so restarting the app doesn't reset the throttle.
 */
const PIN_KEY = 'app-lock-pin';
const BIOMETRIC_KEY = 'app-lock-biometric';
const THROTTLE_KEY = 'app-lock-throttle';
export const PIN_LENGTH = 4;
/** Coming back from the background after this long requires unlocking again. */
const RELOCK_AFTER_MS = 60_000;

/**
 * - `ok`: unlocked.
 * - `wrong`: wrong PIN; `lockedUntil` may now be set.
 * - `wait`: still in a lockout period; nothing was checked.
 * - `exhausted`: too many wrong PINs; the lock was removed and the caller must sign out.
 */
export type PinResult = 'ok' | 'wrong' | 'wait' | 'exhausted';

interface AppLockState {
  loaded: boolean;
  pinSet: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  locked: boolean;
  failures: number;
  lockedUntil: number | null;
  load(): Promise<void>;
  setPin(pin: string): Promise<void>;
  removePin(): Promise<void>;
  setBiometricEnabled(enabled: boolean): Promise<void>;
  unlockWithPin(pin: string): Promise<PinResult>;
  unlockWithBiometrics(prompt: string): Promise<boolean>;
}

export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(salt: string, pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pinHashInput(salt, pin));
}

async function storePin(pin: string): Promise<void> {
  const salt = toHex(Crypto.getRandomBytes(16));
  await SecureStore.setItemAsync(PIN_KEY, encodeStoredPin(salt, await hashPin(salt, pin)));
}

async function saveThrottle(throttle: PinThrottle): Promise<void> {
  if (throttle.failures === 0) await SecureStore.deleteItemAsync(THROTTLE_KEY);
  else await SecureStore.setItemAsync(THROTTLE_KEY, JSON.stringify(throttle));
}

export const useAppLock = create<AppLockState>()((set, get) => ({
  loaded: false,
  pinSet: false,
  biometricEnabled: false,
  biometricAvailable: false,
  locked: false,
  failures: 0,
  lockedUntil: null,

  async load() {
    let pinSet = false;
    let biometricEnabled = false;
    let biometricAvailable = false;
    let throttle = NO_THROTTLE;
    try {
      const stored = parseStoredPin(await SecureStore.getItemAsync(PIN_KEY));
      pinSet = stored !== null;
      // Builds before hashing stored the digits as-is; upgrade them in place.
      if (stored?.kind === 'plain') await storePin(stored.pin);
      biometricEnabled = pinSet && (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1';
      throttle = parseThrottle(await SecureStore.getItemAsync(THROTTLE_KEY));
      biometricAvailable = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    } catch {
      // Without secure storage the lock simply stays off.
    }
    set({ loaded: true, pinSet, biometricEnabled, biometricAvailable, locked: pinSet, ...throttle });
  },

  async setPin(pin) {
    if (!isValidPin(pin)) throw new Error('pin_invalid');
    await storePin(pin);
    await saveThrottle(NO_THROTTLE);
    set({ pinSet: true, ...NO_THROTTLE });
  },

  async removePin() {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    await SecureStore.deleteItemAsync(THROTTLE_KEY);
    set({ pinSet: false, biometricEnabled: false, locked: false, ...NO_THROTTLE });
  },

  async setBiometricEnabled(enabled) {
    if (enabled && !get().pinSet) throw new Error('pin_required');
    if (enabled) await SecureStore.setItemAsync(BIOMETRIC_KEY, '1');
    else await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    set({ biometricEnabled: enabled });
  },

  async unlockWithPin(pin) {
    const now = Date.now();
    const { failures, lockedUntil } = get();
    if (lockedUntil !== null && now < lockedUntil) return 'wait';

    const stored = parseStoredPin(await SecureStore.getItemAsync(PIN_KEY));
    const ok =
      stored?.kind === 'hashed'
        ? (await hashPin(stored.salt, pin)) === stored.hash
        : stored?.kind === 'plain' && stored.pin === pin;
    if (ok) {
      await saveThrottle(NO_THROTTLE);
      set({ locked: false, ...NO_THROTTLE });
      return 'ok';
    }

    const next = recordFailure({ failures, lockedUntil }, now);
    if (attemptsExhausted(next.failures)) {
      await get().removePin();
      return 'exhausted';
    }
    await saveThrottle(next);
    set(next);
    return 'wrong';
  },

  async unlockWithBiometrics(prompt) {
    if (!get().biometricEnabled) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: true });
      if (result.success) {
        await saveThrottle(NO_THROTTLE);
        set({ locked: false, ...NO_THROTTLE });
      }
      return result.success;
    } catch {
      return false;
    }
  },
}));

let backgroundedAt: number | null = null;
let watching = false;

/** Re-locks when the app returns after more than RELOCK_AFTER_MS in the background. */
export function watchAppLock() {
  if (watching) return;
  watching = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'background') backgroundedAt = Date.now();
    else if (state === 'active' && backgroundedAt !== null) {
      if (useAppLock.getState().pinSet && Date.now() - backgroundedAt > RELOCK_AFTER_MS) {
        useAppLock.setState({ locked: true });
      }
      backgroundedAt = null;
    }
  });
}
