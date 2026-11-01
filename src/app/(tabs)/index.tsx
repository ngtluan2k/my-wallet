import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { SigningExpiryBanner } from '@/components/signing';
import { TransactionRow, useCategories } from '@/components/wallet';
import { AppText, EmptyState, Fab, ModernCard, Screen, Skeleton } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { filterTransactions, sortTransactions, summarize, totalsByCategory } from '@/domain/transactions';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useBudgets, useTransactions, useWalletStatus } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

const RECENT_COUNT = 5;

function getGreetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function QuickAction({ icon, label, onPress, iconColor = '#006948' }: { icon: string; label: string; onPress(): void; iconColor?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: iconColor + '20' }]}>
        <AppText size={26}>{icon}</AppText>
      </View>
      <AppText tone="default" size={12} weight="500" style={styles.quickActionLabel}>{label}</AppText>
    </Pressable>
  );
}

function DashboardNetWorthCard({ summary, language, t }: { summary: any; language: 'vi' | 'en'; t: any }) {
  return (
    <View style={styles.netWorthCard}>
      <View style={styles.netWorthGradient}>
        <View style={styles.netWorthContent}>
          <View style={styles.netWorthHeader}>
            <AppText tone="white80" size={13} weight="600">
              {t('dashboard.availableBalance')}
            </AppText>
            <View style={styles.securityBadge}>
              <AppText size={14} tone="white">🔒</AppText>
              <AppText tone="white" size={11} weight="600">{t('dashboard.security')}</AppText>
            </View>
          </View>

          <View style={styles.balanceRow}>
            <AppText style={styles.balanceText}>
              +{formatMoney(Math.max(summary.difference, 0), language)}
            </AppText>
            <AppText weight="600" size={24} tone="white90">₫</AppText>
          </View>

          <View style={styles.subCardsRow}>
            <View style={[styles.subCard, styles.subCardIncome]}>
              <View style={styles.subCardHeader}>
                <View style={[styles.miniIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <AppText size={12} tone="white">↓</AppText>
                </View>
                <AppText tone="white70" size={12}>{t('dashboard.totalIncome')}</AppText>
              </View>
              <AppText weight="700" size={14} tone="white">
                +{formatMoney(summary.income, language)}
              </AppText>
            </View>

            <View style={[styles.subCard, styles.subCardExpense]}>
              <View style={styles.subCardHeader}>
                <View style={[styles.miniIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <AppText size={12} tone="white">↑</AppText>
                </View>
                <AppText tone="white70" size={12}>{t('dashboard.totalExpense')}</AppText>
              </View>
              <AppText weight="700" size={14} tone="white">
                −{formatMoney(summary.expense, language)}
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

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
    () => budgets.filter((b) => {
      const spent = monthTransactions.filter((tx) => tx.categoryId === b.categoryId && tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const percent = b.limit ? (spent / b.limit) * 100 : 0;
      return percent >= 80;
    }).map((b) => {
      const spent = monthTransactions.filter((tx) => tx.categoryId === b.categoryId && tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const percent = b.limit ? Math.round((spent / b.limit) * 100) : 0;
      return { ...b, spent, percent };
    }),
    [budgets, monthTransactions],
  );
  const recent = useMemo(() => sortTransactions(monthTransactions).slice(0, RECENT_COUNT), [monthTransactions]);
  const greeting = t(`dashboard.greeting.${getGreetingPeriod()}`);

  const topCategories = useMemo(() => spending.slice(0, 4), [spending]);

  return (
    <View style={styles.flex}>
      <Screen>
        <SigningExpiryBanner />

        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + '30' }]}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?u=wallet' }}
                style={styles.avatar}
              />
            </View>
            <View style={styles.greetingBox}>
              <AppText tone="muted" size={13}>{greeting}</AppText>
              <AppText weight="600" size={14}>Nam</AppText>
            </View>
          </View>

          <AppText weight="700" size={18} tone="primary" style={styles.appTitle}>
            Ví Mình
          </AppText>

          <Pressable
            style={styles.notificationBtn}
            onPress={() => {}}
            hitSlop={12}
          >
            <View style={styles.notificationDot} />
            <AppText size={24}>🔔</AppText>
          </Pressable>
        </View>

        <View style={styles.periodRow}>
          <View>
            <AppText tone="muted" size={13}>
              Tháng {month.split('-')[1]}/{month.split('-')[0]}
            </AppText>
            <AppText weight="600" size={18}>
              {t('tab.dashboard')}
            </AppText>
          </View>
          <View style={[styles.updatedPill, { borderColor: colors.border }]}>
            <View style={styles.pulseDot} />
            <AppText tone="primary" size={12} weight="600">{t('dashboard.updatedJustNow')}</AppText>
          </View>
        </View>

        <DashboardNetWorthCard summary={summary} language={language as 'vi' | 'en'} t={t} />

        <View style={styles.quickActionsRow}>
          <QuickAction icon="＋" label={t('dashboard.quickActions.add')} onPress={() => router.push('/transaction')} />
          <QuickAction icon="📷" label={t('dashboard.quickActions.scan')} onPress={() => {}} iconColor="#006948" />
          <QuickAction icon="🏦" label={t('dashboard.quickActions.budget')} onPress={() => router.push('/budget')} iconColor="#006948" />
          <QuickAction icon="📊" label={t('dashboard.quickActions.report')} onPress={() => {}} iconColor="#006948" />
        </View>

        {loading ? (
          <ModernCard style={styles.alertCard}>
            <Skeleton width="100%" height={20} />
            <View style={{ marginTop: spacing.sm }}>
              <Skeleton width="100%" height={8} borderRadius={4} />
            </View>
            <View style={{ marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={120} height={14} />
              <Skeleton width={80} height={14} />
            </View>
          </ModernCard>
        ) : alerts.length > 0 ? (
          <View>
            {alerts.map((alert) => {
              const cat = categories.get(alert.categoryId);
              const catName = categoryName(cat);
              const percent = alert.percent;
              return (
                <ModernCard key={alert.categoryId} style={styles.alertCard}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertIconRow}>
                      <View style={[styles.alertIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                        <AppText size={16}>⚠️</AppText>
                      </View>
                      <View>
                        <AppText weight="600" size={13}>{t('dashboard.budgetAlerts')} {catName}</AppText>
                        <AppText tone="muted" size={12}>{t('dashboard.alert.spentOf', { percent: String(percent) })}</AppText>
                      </View>
                    </View>
                    <View style={[styles.alertPercentBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                      <AppText tone="warning" size={11} weight="700">{percent}%</AppText>
                    </View>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(percent, 100)}%`,
                          backgroundColor: percent >= 100 ? colors.danger : '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.alertFooter}>
                    <AppText tone="muted" size={12}>
                      {t('dashboard.alert.used')}: <AppText weight="600" tone="default">{formatMoney(alert.spent, language)}</AppText>
                    </AppText>
                    <AppText tone="muted" size={12}>
                      {t('dashboard.alert.limit')}: <AppText weight="600" tone="default">{formatMoney(alert.limit, language)}</AppText>
                    </AppText>
                  </View>
                </ModernCard>
              );
            })}
          </View>
        ) : null}

        <ModernCard>
          <View style={styles.sectionHeader}>
            <View>
              <AppText weight="600" size={18}>{t('dashboard.spendingByCategory')}</AppText>
              <AppText tone="muted" size={13}>{t('dashboard.analysis.structural')} Tháng {month.split('-')[1]}/{month.split('-')[0]}</AppText>
            </View>
            <Pressable onPress={() => router.push('/budget')} hitSlop={8}>
              <View style={styles.seeDetailRow}>
                <AppText tone="primary" size={13} weight="600">{t('dashboard.seeDetail')}</AppText>
                <AppText size={16} tone="primary">›</AppText>
              </View>
            </Pressable>
          </View>

          <View style={styles.categoryGridContainer}>
            {topCategories.length === 0 ? (
              <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                <AppText tone="muted" size={14}>{t('dashboard.noExpenses')}</AppText>
              </View>
            ) : (
              <View style={styles.categoryTilesContainer}>
                {topCategories.map((s, i) => {
                  const cat = categories.get(s.categoryId);
                  const color = cat?.color ?? colors.textMuted;
                  const percent = Math.round((s.amount / summary.expense) * 100);
                  return (
                    <View key={s.categoryId} style={styles.categoryTile}>
                      <View style={styles.categoryTileLeft}>
                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                        <AppText size={14} weight="500">{categoryName(cat)}</AppText>
                      </View>
                      <AppText weight="700" size={14}>{percent}%</AppText>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ModernCard>

        {loading ? (
          <ModernCard>
            <Skeleton width={120} height={20} />
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
                  <Skeleton width={40} height={40} borderRadius={20} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="40%" height={12} />
                  </View>
                  <Skeleton width={80} height={14} />
                </View>
              ))}
            </View>
          </ModernCard>
        ) : recent.length > 0 ? (
          <ModernCard>
            <View style={styles.sectionHeader}>
              <AppText weight="600" size={18}>{t('dashboard.recent')}</AppText>
              <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                <AppText tone="primary" size={13} weight="600">{t('dashboard.seeAll')}</AppText>
              </Pressable>
            </View>
            <View style={styles.divider} />
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                category={categories.get(tx.categoryId)}
                onPress={() => router.push({ pathname: '/transaction', params: { id: tx.id } })}
              />
            ))}
          </ModernCard>
        ) : null}

        {loading ? null : recent.length === 0 && transactions.length === 0 && (
          <EmptyState
            icon={<AppText size={40}>💰</AppText>}
            title={t('transactions.empty')}
            subtitle={t('dashboard.noExpenses')}
            actionLabel={t('transactions.add')}
            onPress={() => router.push('/transaction')}
          />
        )}

        <Fab label={t('transactions.add')} onPress={() => router.push('/transaction')} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Top app bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(248,249,255,0.85)',
    backdropFilter: 'blur(12px)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  greetingBox: { gap: 1 },
  appTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  notificationBtn: { padding: spacing.xs, position: 'relative' },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#f8f9ff',
  },

  // Period row
  periodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  updatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006948',
  },

  // Net worth card
  netWorthCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 160,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  netWorthGradient: {
    backgroundColor: '#065F46',
  },
  netWorthContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  netWorthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  subCard: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  subCardIncome: { backgroundColor: 'rgba(0,0,0,0.15)' },
  subCardExpense: { backgroundColor: 'rgba(0,0,0,0.15)' },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    textAlign: 'center',
    lineHeight: 14,
  },

  // Alert card
  alertCard: { marginBottom: spacing.xs },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alertIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertPercentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },

  // Progress
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  seeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginBottom: spacing.xs,
  },

  // Category grid
  categoryGridContainer: { marginBottom: spacing.sm },
  categoryTilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  categoryTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});