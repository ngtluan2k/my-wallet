import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/ui';
import { AppText } from '@/components/ui';
import { useT } from '@/i18n';
import { spacing, useTheme } from '@/theme';

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
        headerStyle: {
          backgroundColor: `${colors.surface}cc`,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: { display: 'none' },
        tabBarStyle: {
          backgroundColor: `${colors.surface}ee`,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
        header: ({ navigation }) => (
          <View style={[styles.header, { backgroundColor: `${colors.surface}cc`, borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerAvatar, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              </View>
              <AppText weight="700" size={17} tone="primary" style={styles.headerBrand}>
                {t('app.name')}
              </AppText>
            </View>
            <Pressable hitSlop={12} style={styles.headerBell}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.dashboard'), tabBarIcon: icon('pie-chart-outline') }} />
      <Tabs.Screen name="transactions" options={{ title: t('tab.transactions'), tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="budget" options={{ title: t('tab.budget'), tabBarIcon: icon('wallet-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings'), tabBarIcon: icon('settings-outline') }} />
      {/* Center add button */}
      <Tabs.Screen
        name="transaction"
        options={{
          title: t('transactions.add'),
          tabBarIcon: () => (
            <View style={[styles.centerBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={26} color={colors.onPrimary} />
            </View>
          ),
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    letterSpacing: -0.3,
  },
  headerBell: {
    padding: spacing.xs,
  },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
