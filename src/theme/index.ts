import { useColorScheme } from 'react-native';

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
  /** Neutral for transfers. */
  transfer: string;
  transferSoft: string;
  shadow: string;
  /** Modal backdrop. */
  scrim: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

const light: Theme = {
  dark: false,
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    surfaceTint: '#EFF4FF',
    border: '#E2E8F0',
    text: '#0B1C30',
    textMuted: '#64748B',
    textFaint: '#94A3B8',
    primary: '#006948',
    onPrimary: '#FFFFFF',
    primarySoft: 'rgba(0, 105, 72, 0.10)',
    hero: '#065F46',
    onHero: '#FFFFFF',
    onHeroMuted: 'rgba(255, 255, 255, 0.75)',
    heroPanel: 'rgba(255, 255, 255, 0.12)',
    income: '#047857',
    incomeSoft: 'rgba(4, 120, 87, 0.12)',
    expense: '#EF4444',
    expenseSoft: 'rgba(239, 68, 68, 0.10)',
    warning: '#D97706',
    warningSoft: 'rgba(245, 158, 11, 0.14)',
    danger: '#DC2626',
    dangerSoft: 'rgba(220, 38, 38, 0.10)',
    transfer: '#545C72',
    transferSoft: 'rgba(84, 92, 114, 0.12)',
    shadow: '#0F172A',
    scrim: 'rgba(15, 23, 42, 0.35)',
  },
};

const dark: Theme = {
  dark: true,
  colors: {
    background: '#0B1117',
    surface: '#151D26',
    surfaceMuted: '#1E2833',
    surfaceTint: '#1A2633',
    border: '#2A3642',
    text: '#EAF1FF',
    textMuted: '#9AA8BC',
    textFaint: '#66758A',
    primary: '#68DBA9',
    onPrimary: '#002114',
    primarySoft: 'rgba(104, 219, 169, 0.14)',
    hero: '#0E4F3B',
    onHero: '#F5FFF9',
    onHeroMuted: 'rgba(245, 255, 249, 0.72)',
    heroPanel: 'rgba(255, 255, 255, 0.08)',
    income: '#4ADE80',
    incomeSoft: 'rgba(74, 222, 128, 0.14)',
    expense: '#F87171',
    expenseSoft: 'rgba(248, 113, 113, 0.14)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.16)',
    danger: '#F87171',
    dangerSoft: 'rgba(248, 113, 113, 0.14)',
    transfer: '#BEC6E0',
    transferSoft: 'rgba(190, 198, 224, 0.14)',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.55)',
  },
};

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
