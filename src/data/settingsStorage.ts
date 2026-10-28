import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguagePreference = 'system' | 'vi' | 'en';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  language: LanguagePreference;
  theme: ThemePreference;
}

export const DEFAULT_SETTINGS: Settings = { language: 'system', theme: 'system' };

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      language: ['system', 'vi', 'en'].includes(parsed.language as string) ? parsed.language! : 'system',
      theme: ['system', 'light', 'dark'].includes(parsed.theme as string) ? parsed.theme! : 'system',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
