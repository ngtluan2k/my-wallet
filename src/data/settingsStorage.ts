import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguagePreference = 'system' | 'vi' | 'en';
export type ThemePreference = 'system' | 'light' | 'dark';
export type CurrencyCode = 'VND' | 'USD' | 'EUR' | 'JPY' | 'KRW' | 'THB' | 'SGD' | 'MYR';

export interface Settings {
  language: LanguagePreference;
  theme: ThemePreference;
  currency: CurrencyCode;
  faceIdEnabled: boolean;
  pinEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'system',
  theme: 'system',
  currency: 'VND',
  faceIdEnabled: true,
  pinEnabled: true,
};

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      language: ['system', 'vi', 'en'].includes(parsed.language as string) ? parsed.language! : 'system',
      theme: ['system', 'light', 'dark'].includes(parsed.theme as string) ? parsed.theme! : 'system',
      currency: ['VND', 'USD', 'EUR', 'JPY', 'KRW', 'THB', 'SGD', 'MYR'].includes(parsed.currency as string) ? parsed.currency! : 'VND',
      faceIdEnabled: parsed.faceIdEnabled ?? true,
      pinEnabled: parsed.pinEnabled ?? true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
