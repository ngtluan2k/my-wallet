import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addMonths, formatLocalDate, formatMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import type { Summary } from '@/domain/transactions';
import type { Category, Transaction } from '@/domain/types';
import { useT } from '@/i18n';
import { useWallet } from '@/state/wallet';
import { useSelectedMonth } from '@/state/ui';
import { spacing, useTheme } from '@/theme';

import { AppText, Card, CategoryIcon } from './ui';

export function useCategories(): Map<string, Category> {
  const categories = useWallet((s) => s.data?.categories);
  return useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
}

export function MonthSwitcher() {
  const { month, setMonth } = useSelectedMonth();
  const { language } = useT();
  const { colors } = useTheme();
  return (
    <View style={styles.monthRow}>
      <Pressable onPress={() => setMonth(addMonths(month, -1))} hitSlop={12} accessibilityRole="button">
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <AppText size={17} weight="600">
        {formatMonth(month, language)}
      </AppText>
      <Pressable onPress={() => setMonth(addMonths(month, 1))} hitSlop={12} accessibilityRole="button">
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function SummaryCard({ summary }: { summary: Summary }) {
  const { t, language } = useT();
  return (
    <Card>
      <AppText tone="muted" size={13}>
        {t('summary.difference')}
      </AppText>
      <AppText size={28} weight="700" tone={summary.difference < 0 ? 'expense' : 'default'}>
        {formatMoney(summary.difference, language)}
      </AppText>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <AppText tone="muted" size={13}>
            {t('summary.income')}
          </AppText>
          <AppText tone="income" weight="600">
            {formatMoney(summary.income, language)}
          </AppText>
        </View>
        <View style={styles.summaryCell}>
          <AppText tone="muted" size={13}>
            {t('summary.expense')}
          </AppText>
          <AppText tone="expense" weight="600">
            {formatMoney(summary.expense, language)}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

export function TransactionRow({
  transaction,
  category,
  onPress,
}: {
  transaction: Transaction;
  category: Category | undefined;
  onPress(): void;
}) {
  const { language, categoryName } = useT();
  const income = transaction.type === 'income';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.txRow, pressed && { opacity: 0.6 }]}>
      <CategoryIcon icon={category?.icon ?? 'help'} color={category?.color ?? '#64748B'} />
      <View style={styles.txText}>
        <AppText weight="500" numberOfLines={1}>
          {categoryName(category)}
        </AppText>
        <AppText tone="muted" size={13} numberOfLines={1}>
          {formatLocalDate(transaction.transactionDate, language)}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </AppText>
      </View>
      <AppText weight="600" tone={income ? 'income' : 'expense'}>
        {income ? '+' : '−'}
        {formatMoney(transaction.amount, language)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  summaryRow: { flexDirection: 'row', gap: spacing.lg },
  summaryCell: { flex: 1, gap: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  txText: { flex: 1, gap: 2 },
});
