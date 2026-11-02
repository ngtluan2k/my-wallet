import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguagePreference = 'system' | 'vi' | 'en';
export type ThemePreference = 'system' | 'light' | 'dark';

/** Device preferences. App lock state lives in secure storage (see appLock.ts), not here. */
export interface Settings {
  language: LanguagePreference;
  theme: ThemePreference;
  /** Daily local notification reminding the user to log spending. Off by default. */
  reminderEnabled: boolean;
  /** `HH:mm`, device local time. */
  reminderTime: string;
  /** Time Sensitive: breaks through Focus / Do Not Disturb and stays longer on the lock screen. */
  reminderProminent: boolean;
}

export const DEFAULT_SETTINGS: Settings = { language: 'system', theme: 'system', reminderEnabled: false, reminderTime: '21:00', reminderProminent: false };

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      language: ['system', 'vi', 'en'].includes(parsed.language as string) ? parsed.language! : 'system',
      theme: ['system', 'light', 'dark'].includes(parsed.theme as string) ? parsed.theme! : 'system',
      reminderEnabled: parsed.reminderEnabled === true,
      reminderTime:
        typeof parsed.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.reminderTime)
          ? parsed.reminderTime
          : DEFAULT_SETTINGS.reminderTime,
      reminderProminent: parsed.reminderProminent === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const { language, theme, reminderEnabled, reminderTime, reminderProminent } = settings;
  await AsyncStorage.setItem(KEY, JSON.stringify({ language, theme, reminderEnabled, reminderTime, reminderProminent }));
}
