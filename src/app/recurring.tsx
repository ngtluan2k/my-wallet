import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, EmptyState, IconCircle, ListGroup, Screen } from '@/components/ui';
import { useCategories } from '@/components/wallet';
import type { RecurringRule } from '@/domain/types';
import { useT } from '@/i18n';
import { useWallet, useWallets } from '@/state/wallet';
import { spacing, useTheme } from '@/theme';

const NO_RULES: RecurringRule[] = [];

/** Recurring transactions: what repeats, how often, and when it next happens. */
export default function RecurringScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const rules = useWallet((s) => s.data?.recurring ?? NO_RULES);
  const add = () => router.push('/recurring-edit');

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={add} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('recurring.add')}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        <AppText tone="muted" size={14}>
          {t('recurring.intro')}
        </AppText>
        {rules.length === 0 ? (
          <EmptyState icon="repeat-outline" message={t('recurring.empty')} />
        ) : (
          <ListGroup>
            {rules.map((r) => (
              <RuleRow key={r.id} rule={r} />
            ))}
          </ListGroup>
        )}
        <Button variant="secondary" icon="add" label={t('recurring.add')} onPress={add} />
      </Screen>
    </>
  );
}

function RuleRow({ rule }: { rule: RecurringRule }) {
  const { t, money, categoryName, weekday, relativeDate } = useT();
  const { colors } = useTheme();
  const category = useCategories().get(rule.categoryId);
  const wallet = useWallets().find((w) => w.id === rule.walletId);
  const schedule =
    rule.frequency === 'weekly'
      ? t('recurring.weeklyOn', { weekday: weekday(rule.startDate) })
      : t('recurring.monthlyOn', { day: Number(rule.startDate.slice(8, 10)) });
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recurring-edit', params: { id: rule.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTint }, rule.paused && styles.paused]}
    >
      <IconCircle icon={category?.icon ?? 'repeat'} color={category?.color ?? colors.textMuted} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <AppText weight="600" size={16} numberOfLines={1} style={styles.shrink}>
            {rule.note || categoryName(category)}
          </AppText>
          {rule.paused && <Badge label={t('recurring.pausedBadge')} color={colors.warning} background={colors.warningSoft} />}
        </View>
        <AppText tone="muted" size={13} numberOfLines={1}>
          {schedule} · {wallet?.name ?? '?'}
        </AppText>
        {!rule.paused && (
          <AppText tone="muted" size={13}>
            {t('recurring.next', { date: relativeDate(rule.nextDate) })}
          </AppText>
        )}
      </View>
      <AppText weight="600" tabular tone={rule.type === 'income' ? 'income' : 'expense'}>
        {rule.type === 'income' ? '+' : '−'}
        {money(rule.amount)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paused: { opacity: 0.6 },
});
