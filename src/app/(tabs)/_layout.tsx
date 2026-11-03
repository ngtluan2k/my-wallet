import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { PressScale } from '@/components/motion';
import { AppText, type IconName } from '@/components/ui';
import { useT } from '@/i18n';
import { cardShadow, fontFamily, useTheme } from '@/theme';

function icon(name: IconName, activeName: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue | null; focused: boolean }) {
    return <Ionicons name={focused ? activeName : name} size={24} color={typeof color === 'string' ? color : undefined} />;
  };
}

/** Center "+" opens the add-transaction modal instead of switching tabs. */
function AddButton() {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <PressScale
      onPress={() => router.push('/transaction')}
      accessibilityRole="button"
      accessibilityLabel={t('transactions.add')}
      scaleTo={0.88}
      style={styles.addSlot}
    >
      <View style={[styles.addButton, { backgroundColor: colors.primary }, cardShadow(colors, 2)]}>
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </View>
      <AppText size={11} weight="500" tone="muted">
        {t('tab.add')}
      </AppText>
    </PressScale>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.dashboard'), tabBarIcon: icon('grid-outline', 'grid') }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: t('tab.transactions'), tabBarIcon: icon('receipt-outline', 'receipt') }}
      />
      <Tabs.Screen name="add" options={{ title: t('tab.add'), tabBarButton: () => <AddButton /> }} />
      <Tabs.Screen name="budget" options={{ title: t('tab.budget'), tabBarIcon: icon('wallet-outline', 'wallet') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings'), tabBarIcon: icon('settings-outline', 'settings') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily, fontSize: 11, fontWeight: '500' },
  addSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingBottom: 2 },
  addButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
});
