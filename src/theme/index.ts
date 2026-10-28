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
    background: '#F4F6F8',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1F4',
    border: '#DDE2E8',
    text: '#0F172A',
    textMuted: '#64748B',
    primary: '#0F766E',
    onPrimary: '#FFFFFF',
    income: '#15803D',
    expense: '#DC2626',
    warning: '#B45309',
    danger: '#DC2626',
  },
};

const dark: Theme = {
  dark: true,
  colors: {
    background: '#0B1117',
    surface: '#151D26',
    surfaceMuted: '#1E2833',
    border: '#2A3642',
    text: '#E8EDF2',
    textMuted: '#93A1B0',
    primary: '#2DD4BF',
    onPrimary: '#042F2E',
    income: '#4ADE80',
    expense: '#F87171',
    warning: '#FBBF24',
    danger: '#F87171',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export function useTheme(): Theme {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return isDark ? dark : light;
}
