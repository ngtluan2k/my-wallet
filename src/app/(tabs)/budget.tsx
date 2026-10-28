import { useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { MonthSwitcher, useCategories } from '@/components/wallet';
import { AppText, Card, CategoryIcon, ProgressBar, Screen } from '@/components/ui';
import { budgetStatus, type BudgetStatus } from '@/domain/budgets';
import { formatMoney, groupDigits, parseAmountInput } from '@/domain/money';
import { filterTransactions, totalsByCategory } from '@/domain/transactions';
import type { Category } from '@/domain/types';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useBudgets, useTransactions, walletStore } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

export default function BudgetScreen() {
  const { t } = useT();
  const month = useSelectedMonth((s) => s.month);
  const transactions = useTransactions();
  const budgets = useBudgets();
  const categories = useCategories();

  const expenseCategories = useMemo(() => [...categories.values()].filter((c) => c.type === 'expense'), [categories]);
  const spent = useMemo(
    () =>
      new Map(
        totalsByCategory(filterTransactions(transactions, { month }), 'expense').map((s) => [s.categoryId, s.amount]),
      ),
    [transactions, month],
  );
  const limits = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b.limit])), [budgets]);

  return (
    <Screen>
      <MonthSwitcher />
      <AppText tone="muted">{t('budget.intro')}</AppText>
      {expenseCategories.map((c) => (
        <BudgetRow key={c.id} category={c} limit={limits.get(c.id)} spent={spent.get(c.id) ?? 0} />
      ))}
    </Screen>
  );
}

function BudgetRow({ category, limit, spent }: { category: Category; limit: number | undefined; spent: number }) {
  const { t, language, categoryName } = useT();
  const { colors } = useTheme();
  const [text, setText] = useState(limit ? groupDigits(limit) : '');
  const [editing, setEditing] = useState(false);
  const shown = editing ? text : limit ? groupDigits(limit) : '';

  async function commit() {
    setEditing(false);
    const trimmed = text.trim();
    const parsed = parseAmountInput(trimmed);
    try {
      if (trimmed === '') {
        if (limit !== undefined) await walletStore.getState().removeBudget(category.id);
      } else if (parsed !== null && parsed !== limit) {
        await walletStore.getState().setBudget(category.id, parsed);
      }
    } catch {
      Alert.alert(t('common.error'), t('storage.saveFailed'));
    }
  }

  const status: BudgetStatus | null = limit ? budgetStatus(spent, limit) : null;
  const barColor = status === 'over' ? colors.danger : status === 'warning' ? colors.warning : category.color;

  return (
    <Card>
      <View style={styles.header}>
        <CategoryIcon icon={category.icon} color={category.color} />
        <AppText weight="600" style={styles.flex} numberOfLines={1}>
          {categoryName(category)}
        </AppText>
        <TextInput
          value={shown}
          onFocus={() => {
            setText(limit ? groupDigits(limit) : '');
            setEditing(true);
          }}
          onChangeText={(value) => {
            const parsed = parseAmountInput(value);
            setText(parsed !== null ? groupDigits(parsed) : value.replace(/[^\d]/g, ''));
          }}
          onEndEditing={commit}
          keyboardType="number-pad"
          returnKeyType="done"
          placeholder={t('budget.limitPlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={categoryName(category)}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceMuted }]}
        />
      </View>
      {limit !== undefined && (
        <>
          <ProgressBar ratio={spent / limit} color={barColor} />
          <View style={styles.header}>
            <AppText tone="muted" size={13} style={styles.flex}>
              {t('budget.spentOf', { spent: formatMoney(spent, language), limit: formatMoney(limit, language) })}
            </AppText>
            <AppText size={13} weight="600" tone={status === 'over' ? 'danger' : status === 'warning' ? 'warning' : 'muted'}>
              {spent > limit
                ? t('budget.overBy', { amount: formatMoney(spent - limit, language) })
                : t('budget.remaining', { amount: formatMoney(limit - spent, language) })}
            </AppText>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    minWidth: 120,
    textAlign: 'right',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 15,
  },
});
