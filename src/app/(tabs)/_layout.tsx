import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import type { IconName } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue | null; size: number }) {
    return <Ionicons name={name} color={typeof color === 'number' ? undefined : (color ?? undefined)} size={size} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useT();
  
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.dashboard'), tabBarIcon: icon('pie-chart-outline') }} />
      <Tabs.Screen name="transactions" options={{ title: t('tab.transactions'), tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="budget" options={{ title: t('tab.budget'), tabBarIcon: icon('wallet-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings'), tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}