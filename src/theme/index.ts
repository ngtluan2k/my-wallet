import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    onPrimary: string;
    income: string;
    expense: string;
    warning: string;
    danger: string;
  };
}

const light: Theme = {
  dark: false,
  colors: {
    // Mindful Wealth exact palette from mockup
    background: '#f8f9ff',           // Canvas base (Level 0)
    onBackground: '#0b1c30',
    surface: '#ffffff',              // Level 1 - Card & lists
    onSurface: '#0b1c30',
    surfaceMuted: '#f1f5f9',         // Level 2 - Hover/deeper
    onSurfaceMuted: '#3d4a42',
    border: '#e2e8f0',               // hairline - borders
    outline: '#6d7a72',              // functional elements
    primary: '#006948',              // emerald - primary actions
    onPrimary: '#ffffff',
    primaryContainer: '#00855d',     // elevated primary
    onPrimaryContainer: '#f5fff7',
    secondary: '#006c49',
    onSecondary: '#ffffff',
    tertiary: '#545c72',
    onTertiary: '#ffffff',
    // Semantic colors
    income: '#15803d',
    expense: '#ef4444',
    warning: '#f59e0b',
    danger: '#dc2626',
  },
};

const dark: Theme = {
  dark: true,
  colors: {
    background: '#0b1117',           // Canvas base (Level 0)
    onBackground: '#eaf1ff',
    surface: '#151d26',              // Level 1 - Card & lists
    onSurface: '#eaf1ff',
    surfaceMuted: '#1e2833',         // Level 2 - Hover/deeper
    onSurfaceMuted: '#bec6e0',
    border: '#2a3642',               // hairline - borders
    outline: '#93a1b0',              // functional elements
    primary: '#68dba9',              // inverse-primary from Mindful Wealth
    onPrimary: '#002114',
    primaryContainer: '#85f8c4',     // elevated primary
    onPrimaryContainer: '#002114',
    secondary: '#6ffbbe',
    onSecondary: '#002113',
    tertiary: '#dae2fd',
    onTertiary: '#131b2e',
    // Semantic colors
    income: '#4ade80',
    expense: '#f87171',
    warning: '#fbbf24',
    danger: '#f87171',
  },
};

export const spacing = { 
  xs: 4,    // 0.25rem
  sm: 8,    // 0.5rem  
  md: 16,   // 1rem
  lg: 20,   // 1.25rem
  xl: 28,   // 1.75rem
  xxl: 32   // 2rem
} as const;

export const radius = { 
  sm: 8, 
  md: 12, 
  lg: 18,    // Changed from 16 to 18px
  xl: 24, 
  pill: 999 
} as const;

export function useTheme(): Theme {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return isDark ? dark : light;
}
