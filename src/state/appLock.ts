import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { create } from 'zustand';

/**
 * Optional local app lock. A 4-digit PIN turns the lock on; Face ID / Touch ID is an extra way to
 * unlock and needs the PIN as a fallback. Both are off by default. The PIN is kept in the iOS
 * Keychain via SecureStore, never in AsyncStorage or the wallet file.
 */
const PIN_KEY = 'app-lock-pin';
const BIOMETRIC_KEY = 'app-lock-biometric';
export const PIN_LENGTH = 4;
/** Coming back from the background after this long requires unlocking again. */
const RELOCK_AFTER_MS = 60_000;

interface AppLockState {
  loaded: boolean;
  pinSet: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  locked: boolean;
  load(): Promise<void>;
  setPin(pin: string): Promise<void>;
  removePin(): Promise<void>;
  setBiometricEnabled(enabled: boolean): Promise<void>;
  unlockWithPin(pin: string): Promise<boolean>;
  unlockWithBiometrics(prompt: string): Promise<boolean>;
}

export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

export const useAppLock = create<AppLockState>()((set, get) => ({
  loaded: false,
  pinSet: false,
  biometricEnabled: false,
  biometricAvailable: false,
  locked: false,

  async load() {
    let pinSet = false;
    let biometricEnabled = false;
    let biometricAvailable = false;
    try {
      pinSet = (await SecureStore.getItemAsync(PIN_KEY)) !== null;
      biometricEnabled = pinSet && (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1';
      biometricAvailable = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    } catch {
      // Without secure storage the lock simply stays off.
    }
    set({ loaded: true, pinSet, biometricEnabled, biometricAvailable, locked: pinSet });
  },

  async setPin(pin) {
    if (!isValidPin(pin)) throw new Error('pin_invalid');
    await SecureStore.setItemAsync(PIN_KEY, pin);
    set({ pinSet: true });
  },

  async removePin() {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    set({ pinSet: false, biometricEnabled: false, locked: false });
  },

  async setBiometricEnabled(enabled) {
    if (enabled && !get().pinSet) throw new Error('pin_required');
    if (enabled) await SecureStore.setItemAsync(BIOMETRIC_KEY, '1');
    else await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    set({ biometricEnabled: enabled });
  },

  async unlockWithPin(pin) {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    const ok = stored !== null && stored === pin;
    if (ok) set({ locked: false });
    return ok;
  },

  async unlockWithBiometrics(prompt) {
    if (!get().biometricEnabled) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: true });
      if (result.success) set({ locked: false });
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
