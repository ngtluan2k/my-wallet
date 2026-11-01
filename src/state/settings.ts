import { create } from 'zustand';

import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '@/data/settingsStorage';

interface SettingsState extends Settings {
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<Settings>): void;
}

export const useSettings = create<SettingsState>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    console.log('[Settings] Loading...');
    try {
      const settings = await loadSettings();
      console.log('[Settings] Loaded:', settings);
      set({ ...settings, loaded: true });
    } catch (error) {
      console.error('[Settings] Load error:', error);
      set({ loaded: true });
    }
  },
  update(patch) {
    set(patch);
    const { language, theme } = get();
    // A failed settings write only loses a preference, so it isn't surfaced.
    saveSettings({ language, theme }).catch(() => undefined);
  },
}));
