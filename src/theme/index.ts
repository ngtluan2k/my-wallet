import { useColorScheme } from 'react-native';
import { useSettings } from '@/state/settings';

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    text: string;
    surface: string;
    textMuted: string;
    surfaceMuted: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    border: string;
    outline: string;
    outlineVariant: string;
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    income: string;
    expense: string;
    warning: string;
    danger: string;
    onBackground: string;
  };
}

const light: Theme = {
  dark: false,
  colors: {
    background: '#f8f9ff',
    text: '#0b1c30',
    surface: '#ffffff',
    textMuted: '#3d4a42',
    surfaceMuted: '#f1f5f9',
    surfaceContainerLow: '#eff4ff',
    surfaceContainer: '#e5eeff',
    surfaceContainerHigh: '#dce9ff',
    surfaceContainerHighest: '#d3e4fe',
    border: '#e2e8f0',
    outline: '#6d7a72',
    outlineVariant: '#bccac0',
    primary: '#006948',
    onPrimary: '#ffffff',
    primaryContainer: '#00855d',
    onPrimaryContainer: '#f5fff7',
    secondary: '#006c49',
    onSecondary: '#ffffff',
    secondaryContainer: '#6cf8bb',
    onSecondaryContainer: '#00714d',
    tertiary: '#545c72',
    onTertiary: '#ffffff',
    tertiaryContainer: '#6c748b',
    onTertiaryContainer: '#fefcff',
    income: '#15803d',
    expense: '#ef4444',
    warning: '#f59e0b',
    danger: '#dc2626',
    onBackground: '#0b1c30',
  },
};

const dark: Theme = {
  dark: true,
  colors: {
    background: '#0b1117',
    text: '#eaf1ff',
    surface: '#151d26',
    textMuted: '#bec6e0',
    surfaceMuted: '#1e2833',
    surfaceContainerLow: '#213145',
    surfaceContainer: '#213145',
    surfaceContainerHigh: '#213145',
    surfaceContainerHighest: '#213145',
    border: '#2a3642',
    outline: '#93a1b0',
    outlineVariant: '#3f465c',
    primary: '#68dba9',
    onPrimary: '#002114',
    primaryContainer: '#85f8c4',
    onPrimaryContainer: '#002114',
    secondary: '#6ffbbe',
    onSecondary: '#002113',
    secondaryContainer: '#4edea3',
    onSecondaryContainer: '#005236',
    tertiary: '#dae2fd',
    onTertiary: '#131b2e',
    tertiaryContainer: '#dae2fd',
    onTertiaryContainer: '#131b2e',
    income: '#4ade80',
    expense: '#f87171',
    warning: '#fbbf24',
    danger: '#f87171',
    onBackground: '#eaf1ff',
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
  const isDark =
    preference === 'system'
      ? system === 'dark'
      : preference === 'dark';
  return isDark ? dark : light;
}