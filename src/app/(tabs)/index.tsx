import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Image,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { SigningExpiryBanner } from '@/components/signing';
import { MonthSwitcher, SummaryCard, TransactionRow, useCategories } from '@/components/wallet';
import { AppText, Card, CategoryIcon, EmptyState, Fab, ProgressBar, Screen, SectionTitle, Skeleton } from '@/components/ui';
import { budgetUsage } from '@/domain/budgets';
import { formatMoney } from '@/domain/money';
import { filterTransactions, sortTransactions, summarize, totalsByCategory } from '@/domain/transactions';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useBudgets, useTransactions, useWalletStatus } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

const RECENT_COUNT = 5;

export default function DashboardScreen() {
  const { t, language, categoryName } = useT();
  const { colors } = useTheme();
  const month = useSelectedMonth((s) => s.month);
  const transactions = useTransactions();
  const budgets = useBudgets();
  const categories = useCategories();
  const status = useWalletStatus();
  const loading = status === 'idle' || status === 'loading';

  const monthTransactions = useMemo(() => filterTransactions(transactions, { month }), [transactions, month]);
  const summary = useMemo(() => summarize(monthTransactions), [monthTransactions]);
  const spending = useMemo(() => totalsByCategory(monthTransactions, 'expense'), [monthTransactions]);
  const alerts = useMemo(
    () => budgetUsage(budgets, monthTransactions).filter((u) => u.status !== 'ok'),
    [budgets, monthTransactions],
  );
  const recent = useMemo(() => sortTransactions(monthTransactions).slice(0, RECENT_COUNT), [monthTransactions]);

  function onRefresh() {
    // Refresh triggered by re-selecting the same month, which causes re-fetch via zustand
    // In a real app with React Query, this would call refetch()
  }

  return (
    <View style={styles.flex}>
      <Screen>
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />

        <SigningExpiryBanner />
        <MonthSwitcher />

        {/* Profile Section */}
        <Card style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.profileRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?u=wallet' }}
                style={styles.avatarImage}
              />
            </View>
            <View style={styles.profileInfo}>
              <AppText weight="600" size={18}>
                {'Người dùng'}
              </AppText>
              <AppText tone="muted" size={14}>
                {'ví.minh@example.com'}
              </AppText>
            </View>
            <View style={styles.profileActions}>
              <AppText size={20} tone="primary">
                {'💰'}
              </AppText>
            </View>
          </View>
          <View style={[styles.profileStats, { backgroundColor: colors.surface }]}>
            {loading ? (
              <View style={styles.stat}>
                <Skeleton width={80} height={12} />
                <Skeleton width={120} height={24} />
              </View>
            ) : (
              <View style={styles.stat}>
                <AppText tone="muted" size={12}>
                  {'Tổng thu'}
                </AppText>
                <AppText weight="600" tone="income">
                  {formatMoney(summary.income, language)}
                </AppText>
              </View>
            )}
            {loading ? (
              <View style={styles.stat}>
                <Skeleton width={80} height={12} />
                <Skeleton width={120} height={24} />
              </View>
            ) : (
              <View style={styles.stat}>
                <AppText tone="muted" size={12}>
                  {'Tổng chi'}
                </AppText>
                <AppText weight="600" tone="expense">
                  {formatMoney(summary.expense, language)}
                </AppText>
              </View>
            )}
            {loading ? (
              <View style={styles.stat}>
                <Skeleton width={80} height={12} />
                <Skeleton width={120} height={24} />
              </View>
            ) : (
              <View style={styles.stat}>
                <AppText tone="muted" size={12}>
                  {'Chênh lệch'}
                </AppText>
                <AppText weight="600" tone={summary.difference < 0 ? 'expense' : 'default'}>
                  {formatMoney(summary.difference, language)}
                </AppText>
              </View>
            )}
          </View>
        </Card>

        {loading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={16} />
            <Skeleton width="100%" height={16} style={styles.skeletonRow} />
            <Skeleton width="100%" height={16} style={styles.skeletonRow} />
          </View>
        ) : (
          <SummaryCard summary={summary} />
        )}

        {loading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={100} />
            <Skeleton width="100%" height={100} style={styles.skeletonRow} />
            <Skeleton width="100%" height={100} style={styles.skeletonRow} />
          </View>
        ) : (
          alerts.length > 0 && (
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
          )
        )}

        <Card>
          <SectionTitle>{t('dashboard.spendingByCategory')}</SectionTitle>
          {loading ? (
            <View style={styles.spendingSkeleton}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.spendingItemSkeleton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Skeleton width={40} height={40} borderRadius={20} />
                  <View style={styles.spendingBodySkeleton}>
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="40%" height={20} />
                    <Skeleton width="100%" height={6} />
                    <Skeleton width="30%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : spending.length === 0 ? (
            <EmptyState
              icon={<AppText size={40}>📭</AppText>}
              title={t('dashboard.noExpenses')}
              subtitle={t('transactions.empty')}
              actionLabel={t('transactions.add')}
              onPress={() => router.push('/transaction')}
            />
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

        {loading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={80} />
            <Skeleton width="100%" height={80} style={styles.skeletonRow} />
            <Skeleton width="100%" height={80} style={styles.skeletonRow} />
          </View>
        ) : (
          recent.length > 0 && (
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
          )
        )}

        {!loading && recent.length === 0 && transactions.length === 0 && (
          <EmptyState
            icon={<AppText size={40}>💰</AppText>}
            title={t('transactions.empty')}
            subtitle={t('dashboard.noExpenses')}
            actionLabel={t('transactions.add')}
            onPress={() => router.push('/transaction')}
          />
        )}
      </Screen>
      <Fab label={t('transactions.add')} onPress={() => router.push('/transaction')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profileCard: { marginBottom: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  profileInfo: { flex: 1 },
  profileActions: { alignItems: 'flex-end' },
  profileStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  stat: { gap: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spendBody: { flex: 1, gap: 6 },
  spendHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  percent: { width: 36, textAlign: 'right' },
  skeletonContainer: { gap: spacing.sm, padding: spacing.lg },
  skeletonRow: { marginTop: spacing.sm },
  spendingSkeleton: { gap: spacing.sm },
  spendingItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  spendingBodySkeleton: { flex: 1, gap: spacing.sm },
});