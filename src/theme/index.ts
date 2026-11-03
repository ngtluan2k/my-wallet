import { Platform, useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

/**
 * Color tokens. Screens and components take every color from here (via useTheme), never as
 * literals, so light and dark stay in step. Values follow `mockup UI/DESIGN.md`.
 */
export interface ThemeColors {
  /** Level 0 canvas. */
  background: string;
  /** Level 1 cards and grouped lists. */
  surface: string;
  /** Muted fills: tracks, secondary buttons, key backgrounds. */
  surfaceMuted: string;
  /** Pressed rows, subtle tints. */
  surfaceTint: string;
  border: string;
  text: string;
  textMuted: string;
  /** Lowest-emphasis text (captions under footers). */
  textFaint: string;
  primary: string;
  onPrimary: string;
  /** Primary at low opacity, for icon circles and selected chips. */
  primarySoft: string;
  /** Large summary cards (balance, budget overview). */
  hero: string;
  onHero: string;
  onHeroMuted: string;
  /** Translucent panels inside a hero card. */
  heroPanel: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  /** Money lent or borrowed: its own hue so it never reads as income (green) or expense (red). */
  debt: string;
  debtSoft: string;
  /** Neutral for transfers. */
  transfer: string;
  transferSoft: string;
  shadow: string;
  /** Modal backdrop. */
  scrim: string;
  /** Brand mark parts (see BrandMark): tilted card, wallet body, clasp tab, coin. */
  logoCard: string;
  logoBody: string;
  logoTab: string;
  logoCoin: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

const light: Theme = {
  dark: false,
  colors: {
    background: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    surfaceTint: '#EDF2F9',
    border: '#E1E7F0',
    text: '#0F1E33',
    textMuted: '#5F6E85',
    textFaint: '#94A3B8',
    primary: '#1C4D86',
    onPrimary: '#FFFFFF',
    primarySoft: 'rgba(28, 77, 134, 0.10)',
    hero: '#1C4D86',
    onHero: '#FFFFFF',
    onHeroMuted: 'rgba(255, 255, 255, 0.78)',
    heroPanel: 'rgba(255, 255, 255, 0.13)',
    income: '#009753',
    incomeSoft: 'rgba(0, 151, 83, 0.12)',
    expense: '#EE64A4',
    expenseSoft: 'rgba(238, 100, 164, 0.13)',
    debt: '#7C5CC4',
    debtSoft: 'rgba(124, 92, 196, 0.12)',
    warning: '#D97706',
    warningSoft: 'rgba(245, 158, 11, 0.14)',
    danger: '#DC2626',
    dangerSoft: 'rgba(220, 38, 38, 0.10)',
    transfer: '#545C72',
    transferSoft: 'rgba(84, 92, 114, 0.12)',
    shadow: '#0F2440',
    scrim: 'rgba(15, 23, 42, 0.35)',
    logoCard: '#009753',
    logoBody: '#1C4D86',
    logoTab: '#2C629F',
    logoCoin: '#EE64A4',
  },
};

const dark: Theme = {
  dark: true,
  colors: {
    background: '#0A1220',
    surface: '#131D2C',
    surfaceMuted: '#1C2838',
    surfaceTint: '#1A2740',
    border: '#283649',
    text: '#EAF1FF',
    textMuted: '#9AA8BC',
    textFaint: '#66758A',
    primary: '#8DB4EA',
    onPrimary: '#0A1C33',
    primarySoft: 'rgba(141, 180, 234, 0.15)',
    hero: '#1C4D86',
    onHero: '#FFFFFF',
    onHeroMuted: 'rgba(255, 255, 255, 0.75)',
    heroPanel: 'rgba(255, 255, 255, 0.10)',
    income: '#3CCB86',
    incomeSoft: 'rgba(60, 203, 134, 0.15)',
    expense: '#F48BBE',
    expenseSoft: 'rgba(244, 139, 190, 0.15)',
    debt: '#B6A2EC',
    debtSoft: 'rgba(182, 162, 236, 0.16)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.16)',
    danger: '#F87171',
    dangerSoft: 'rgba(248, 113, 113, 0.14)',
    transfer: '#BEC6E0',
    transferSoft: 'rgba(190, 198, 224, 0.14)',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.55)',
    logoCard: '#009753',
    logoBody: '#2B62A6',
    logoTab: '#4A80C2',
    logoCoin: '#EE64A4',
  },
};

/**
 * Brand typeface, embedded at build time by the expo-font plugin (app.json). iOS resolves the
 * family from the font files ("Be Vietnam Pro"), Android uses the name declared in app.json.
 * fontWeight picks the face. Builds without the embedded files (Expo Go, web) fall back to the
 * system font.
 */
export const fontFamily = Platform.select<string | undefined>({
  ios: 'Be Vietnam Pro',
  android: 'BeVietnamPro',
  default: undefined,
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export function useTheme(): Theme {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return isDark ? dark : light;
}

/** Category/wallet colors are data, not theme tokens; this tints them for icon circles. */
export function tint(hex: string, alpha = 0.12): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function cardShadow(colors: ThemeColors, level: 1 | 2 = 1) {
  return {
    shadowColor: colors.shadow,
    shadowOpacity: level === 1 ? 0.04 : 0.08,
    shadowRadius: level === 1 ? 20 : 24,
    shadowOffset: { width: 0, height: level === 1 ? 4 : 8 },
    elevation: level === 1 ? 2 : 6,
  };
}
