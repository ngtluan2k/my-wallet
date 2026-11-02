import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { spacing, useTheme } from '@/theme';

import { AppText } from './ui';
import { SyncStatus } from './wallet';

/** Brand bar shown at the top of every tab: logo and name on the left, sync state on the right. */
export function AppHeader({ right }: { right?: ReactNode }) {
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + spacing.sm, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="wallet" size={18} color={colors.primary} />
        </View>
        <AppText size={18} weight="700" tone="primary">
          {t('app.name')}
        </AppText>
      </View>
      {right ?? <SyncStatus />}
    </View>
  );
}

/** A tab page: brand bar plus content. */
export function TabPage({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <AppHeader />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
