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
import { budgetUsage } from '@/domain/budgets';
import { formatMoney } from '@/domain/money';
import { filterTransactions, sortTransactions, summarize, totalsByCategory } from '@/domain/transactions';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useBudgets, useTransactions, useWalletStatus } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

const RECENT_COUNT = 5;
const EMERALD_DARK = '#065F46';
const EMERALD_MID = '#059669';
const EMERALD_LIGHT = '#047857';

type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

function getGreetingPeriod(): GreetingPeriod {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const worthCardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

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
  const greeting = t(`dashboard.greeting.${getGreetingPeriod()}`);

  // Top 4 expense categories for the analysis section
  const topCategories = useMemo(() => spending.slice(0, 4), [spending]);

  return (
    <View style={styles.flex}>
      <Screen>
        <SigningExpiryBanner />

        {/* ── Top App Bar ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + '30' }]}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?u=wallet' }}
                style={styles.avatar}
              />
            </View>
            <View style={styles.greetingBox}>
              <AppText tone="muted" size={11}>{greeting}</AppText>
              <AppText weight="600" size={13}>Nam</AppText>
            </View>
          </View>
          <AppText weight="700" size={20} tone="primary" style={styles.appTitle}>
            Ví Mình
          </AppText>
          <Pressable
            style={styles.notificationBtn}
            onPress={() => {}}
            hitSlop={12}
          >
            <View style={styles.notificationDot} />
            <AppText size={22}>🔔</AppText>
          </Pressable>
        </View>

        {/* ── Period Pill ── */}
        <View style={styles.periodRow}>
          <View>
            <AppText tone="muted" size={13}>
              {month}
            </AppText>
            <AppText weight="600" size={17}>
              {t('tab.dashboard')}
            </AppText>
          </View>
          <View style={[styles.updatedPill, { borderColor: colors.border }]}>
            <View style={styles.pulseDot} />
            <AppText tone="primary" size={11} weight="600">{t('dashboard.updatedJustNow')}</AppText>
          </View>
        </View>

        {/* ── Net Worth Card (Emerald Gradient) ── */}
        <View style={styles.worthCard}>
          {/* Gradient overlay layers */}
          <View style={[styles.gradientLayer, { backgroundColor: EMERALD_DARK }]} />
          <View style={[styles.gradientLayer, { backgroundColor: EMERALD_MID, opacity: 0.85 }]} />
          <View style={[styles.gradientLayer, { backgroundColor: EMERALD_LIGHT, opacity: 0.7 }]} />
          {/* Decorative blurs */}
          <View style={styles.blurOrb1} />
          <View style={styles.blurOrb2} />

          <View style={styles.worthContent}>
            <View style={styles.worthHeader}>
              <AppText tone="white80" size={13} weight="600">
                {t('dashboard.availableBalance')}
              </AppText>
              <View style={[styles.securityBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <AppText size={12} tone="white">🔒</AppText>
                <AppText tone="white" size={11} weight="600">{t('dashboard.security')}</AppText>
              </View>
            </View>

            <View style={styles.balanceRow}>
              <AppText style={styles.balanceText}>
                +{formatMoney(Math.max(summary.difference, 0), language)}
              </AppText>
              <AppText weight="600" size={20} tone="white90">₫</AppText>
            </View>

            <View style={styles.subCardsRow}>
              {/* Total income */}
              <View style={[styles.subCard, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                <View style={styles.subCardHeader}>
                  <View style={[styles.miniIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <AppText size={10} tone="white">↓</AppText>
                  </View>
                  <AppText tone="white70" size={11}>{t('dashboard.totalIncome')}</AppText>
                </View>
                <AppText weight="700" size={13} tone="white">
                  +{formatMoney(summary.income, language)}
                </AppText>
              </View>
              {/* Total expense */}
              <View style={[styles.subCard, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                <View style={styles.subCardHeader}>
                  <View style={[styles.miniIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <AppText size={10} tone="white">↑</AppText>
                  </View>
                  <AppText tone="white70" size={11}>{t('dashboard.totalExpense')}</AppText>
                </View>
                <AppText weight="700" size={13} tone="white">
                  −{formatMoney(summary.expense, language)}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsRow}>
          <QuickAction icon="➕" label={t('dashboard.quickActions.add')} onPress={() => router.push('/transaction')} />
          <QuickAction icon="📷" label={t('dashboard.quickActions.scan')} onPress={() => {}} />
          <QuickAction icon="🏦" label={t('dashboard.quickActions.budget')} onPress={() => router.push('/budget')} />
          <QuickAction icon="📊" label={t('dashboard.quickActions.report')} onPress={() => {}} />
        </View>

        {/* ── Budget Alert Card ── */}
        {loading ? (
          <ModernCard>
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
          alerts.map((alert) => {
            const cat = categories.get(alert.categoryId);
            const catName = categoryName(cat);
            const percent = Math.round((alert.spent / alert.limit) * 100);
            return (
              <ModernCard key={alert.categoryId} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertIconRow}>
                    <View style={[styles.alertIcon, { backgroundColor: colors.warning + '20' }]}>
                      <AppText size={16}>⚠️</AppText>
                    </View>
                    <View>
                      <AppText weight="600" size={13}>{t('dashboard.budgetAlerts')} {catName}</AppText>
                      <AppText tone="muted" size={12}>{t('dashboard.alert.spentOf', { percent: String(percent) })}</AppText>
                    </View>
                  </View>
                  <View style={[styles.alertPercentBadge, { backgroundColor: colors.warning + '20' }]}>
                    <AppText tone="warning" size={11} weight="700">{percent}%</AppText>
                  </View>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(percent, 100)}%`,
                        backgroundColor: percent >= 100 ? colors.danger : colors.warning,
                      },
                    ]}
                  />
                </View>
                <View style={styles.alertFooter}>
                  <AppText tone="muted" size={11}>
                    {t('dashboard.alert.used')}: <AppText weight="600" tone="default">{formatMoney(alert.spent, language)}</AppText>
                  </AppText>
                  <AppText tone="muted" size={11}>
                    {t('dashboard.alert.limit')}: <AppText weight="600" tone="default">{formatMoney(alert.limit, language)}</AppText>
                  </AppText>
                </View>
              </ModernCard>
            );
          })
        ) : null}

        {/* ── Expense Analysis ── */}
        <ModernCard>
          <View style={styles.sectionHeader}>
            <View>
              <AppText weight="600" size={17}>{t('dashboard.spendingByCategory')}</AppText>
              <AppText tone="muted" size={12}>{t('dashboard.analysis.structural')} {month}</AppText>
            </View>
            <Pressable onPress={() => router.push('/budget')} hitSlop={8}>
              <View style={styles.seeDetailRow}>
                <AppText tone="primary" size={12} weight="600">{t('dashboard.seeDetail')}</AppText>
                <AppText size={14} tone="primary">›</AppText>
              </View>
            </Pressable>
          </View>

          {/* Stacked progress bar */}
          {spending.length > 0 ? (
            <View style={styles.stackedBarContainer}>
              <View style={[styles.stackedBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                {(() => {
                  const total = summary.expense || 1;
                  let cumPercent = 0;
                  const catColors = ['#006948', '#0284C7', '#EAB308', '#8B5CF6'];
                  return topCategories.map((s, i) => {
                    const pct = (s.amount / total) * 100;
                    const left = cumPercent;
                    cumPercent += pct;
                    return (
                      <View
                        key={s.categoryId}
                        style={[
                          styles.stackedBarSegment,
                          {
                            width: `${pct}%`,
                            left: `${left}%`,
                            backgroundColor: catColors[i] ?? colors.primary,
                          },
                        ]}
                      />
                    );
                  });
                })()}
              </View>
              <View style={styles.stackedBarFooter}>
                <AppText tone="muted" size={11}>{t('dashboard.analysis.allocated')}</AppText>
                <AppText weight="700" size={11}>{formatMoney(summary.expense, language)}</AppText>
              </View>
            </View>
          ) : null}

          {/* Category tiles */}
          <View style={styles.categoryGrid}>
            {topCategories.length === 0 ? (
              <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                <AppText tone="muted" size={13}>{t('dashboard.noExpenses')}</AppText>
              </View>
            ) : (
              topCategories.map((s, i) => {
                const cat = categories.get(s.categoryId);
                const color = cat?.color ?? colors.textMuted;
                const percent = Math.round((s.amount / summary.expense) * 100);
                return (
                  <View key={s.categoryId} style={[styles.categoryTile, { borderColor: colors.border }]}>
                    <View style={styles.categoryTileLeft}>
                      <View style={[styles.colorDot, { backgroundColor: color }]} />
                      <AppText size={12} weight="500">{categoryName(cat)}</AppText>
                    </View>
                    <AppText weight="700" size={13}>{percent}%</AppText>
                  </View>
                );
              })
            )}
          </View>
        </ModernCard>

        {/* ── Recent Transactions ── */}
        {loading ? (
          <ModernCard>
            <Skeleton width={120} height={18} />
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
              <AppText weight="600" size={17}>{t('dashboard.recent')}</AppText>
              <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                <AppText tone="primary" size={12} weight="600">{t('dashboard.seeAll')}</AppText>
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
      </Screen>

      <Fab label={t('transactions.add')} onPress={() => router.push('/transaction')} />
    </View>
  );
}

/* ── Sub-components ── */

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress(): void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '18' }]}>
        <AppText size={22}>{icon}</AppText>
      </View>
      <AppText tone="default" size={10} weight="500" style={styles.quickActionLabel}>{label}</AppText>
    </Pressable>
  );
}

/* ── Styles ── */

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
  worthCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 160,
    ...worthCardShadow,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFill,
  },
  blurOrb1: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blurOrb2: {
    position: 'absolute',
    left: -40,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167,243,208,0.1)',
  },
  worthContent: {
    position: 'relative',
    zIndex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  worthHeader: {
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

  // Stacked bar
  stackedBarContainer: { marginBottom: spacing.sm },
  stackedBarTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  stackedBarSegment: {
    position: 'absolute',
    height: '100%',
    borderRadius: 6,
  },
  stackedBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  categoryTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
