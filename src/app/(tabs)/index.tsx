import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SigningExpiryBanner } from '@/components/signing';
import { MonthSwitcher, SummaryCard, TransactionRow, useCategories } from '@/components/wallet';
import { AppText, Card, CategoryIcon, Fab, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { budgetUsage } from '@/domain/budgets';
import { formatMoney } from '@/domain/money';
import { filterTransactions, sortTransactions, summarize, totalsByCategory } from '@/domain/transactions';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useBudgets, useTransactions } from '@/state/wallet';
import { spacing, useTheme } from '@/theme';

const RECENT_COUNT = 5;

export default function DashboardScreen() {
  const { t, language, categoryName } = useT();
  const { colors } = useTheme();
  const month = useSelectedMonth((s) => s.month);
  const transactions = useTransactions();
  const budgets = useBudgets();
  const categories = useCategories();

  const monthTransactions = useMemo(() => filterTransactions(transactions, { month }), [transactions, month]);
  const summary = useMemo(() => summarize(monthTransactions), [monthTransactions]);
  const spending = useMemo(() => totalsByCategory(monthTransactions, 'expense'), [monthTransactions]);
  const alerts = useMemo(
    () => budgetUsage(budgets, monthTransactions).filter((u) => u.status !== 'ok'),
    [budgets, monthTransactions],
  );
  const recent = useMemo(() => sortTransactions(monthTransactions).slice(0, RECENT_COUNT), [monthTransactions]);

  return (
    <View style={styles.flex}>
      <Screen>
        <SigningExpiryBanner />
        <MonthSwitcher />
        <SummaryCard summary={summary} />

        {alerts.length > 0 && (
          <Card>
            <SectionTitle>{t('dashboard.budgetAlerts')}</SectionTitle>
            {alerts.map((a) => (
              <View key={a.categoryId} style={styles.alertRow}>
                <AppText style={styles.flex}>{categoryName(categories.get(a.categoryId))}</AppText>
                <AppText weight="600" tone={a.status === 'over' ? 'danger' : 'warning'}>
                  {t(a.status === 'over' ? 'budget.status.over' : 'budget.status.warning')}
                </AppText>
              </View>
            ))}
          </Card>
        )}

        <Card>
          <SectionTitle>{t('dashboard.spendingByCategory')}</SectionTitle>
          {spending.length === 0 ? (
            <AppText tone="muted">{t('dashboard.noExpenses')}</AppText>
          ) : (
            spending.map((s) => {
              const category = categories.get(s.categoryId);
              const color = category?.color ?? colors.textMuted;
              const percent = Math.round((s.amount / summary.expense) * 100);
              return (
                <View key={s.categoryId} style={styles.spendRow}>
                  <CategoryIcon icon={category?.icon ?? 'help'} color={color} size={32} />
                  <View style={styles.spendBody}>
                    <View style={styles.spendHeader}>
                      <AppText style={styles.flex} numberOfLines={1}>
                        {categoryName(category)}
                      </AppText>
                      <AppText weight="600">{formatMoney(s.amount, language)}</AppText>
                    </View>
                    <View style={styles.spendHeader}>
                      <View style={styles.flex}>
                        <ProgressBar ratio={s.amount / summary.expense} color={color} />
                      </View>
                      <AppText tone="muted" size={12} style={styles.percent}>
                        {percent}%
                      </AppText>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {recent.length > 0 && (
          <Card>
            <SectionTitle>{t('dashboard.recent')}</SectionTitle>
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                category={categories.get(tx.categoryId)}
                onPress={() => router.push({ pathname: '/transaction', params: { id: tx.id } })}
              />
            ))}
          </Card>
        )}
      </Screen>
      <Fab label={t('transactions.add')} onPress={() => router.push('/transaction')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spendBody: { flex: 1, gap: 6 },
  spendHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  percent: { width: 36, textAlign: 'right' },
});
