import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { TabPage } from '@/components/AppHeader';
import { SigningExpiryBanner } from '@/components/signing';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  HeroCard,
  IconCircle,
  PageTitle,
  ProgressBar,
  Screen,
  SectionHeader,
  type IconName,
} from '@/components/ui';
import { monthTransactions, TransactionRow, useCategories, useWalletMap } from '@/components/wallet';
import { budgetOverview, budgetUsage, usagePercent } from '@/domain/budgets';
import { today } from '@/domain/dates';
import { debtTotals } from '@/domain/debts';
import { sortTransactions, summarize, totalsByCategory } from '@/domain/transactions';
import { totalBalance } from '@/domain/wallets';
import { useT } from '@/i18n';
import { dismissLegacyImport, importLegacyData, useLegacyImport } from '@/state/session';
import { useBudgets, useDebts, useTransactions, useWallets } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

const TOP_CATEGORIES = 4;
const RECENT_COUNT = 5;

export default function DashboardScreen() {
  const { t, month: monthLabel, money, signedMoney, categoryName } = useT();
  const { colors } = useTheme();
  const transactions = useTransactions();
  const budgets = useBudgets();
  const wallets = useWallets();
  const debts = useDebts();
  const categories = useCategories();
  const walletMap = useWalletMap();
  const month = today().slice(0, 7);

  const monthTxs = useMemo(() => monthTransactions(transactions, month), [transactions, month]);
  const summary = useMemo(() => summarize(monthTxs), [monthTxs]);
  const balance = useMemo(() => totalBalance(wallets, transactions, debts), [wallets, transactions, debts]);
  const recent = useMemo(() => sortTransactions(transactions).slice(0, RECENT_COUNT), [transactions]);
  const budgetStatus = useMemo(
    () => (budgets.length ? budgetOverview(budgets, monthTxs, month, today()).status : null),
    [budgets, monthTxs, month],
  );
  const byCategory = useMemo(() => totalsByCategory(monthTxs, 'expense'), [monthTxs]);
  const debtSummary = useMemo(() => debtTotals(debts), [debts]);

  // The budget closest to (or furthest over) its limit, once it reaches the warning threshold.
  const alert = useMemo(() => {
    const worst = budgetUsage(budgets, monthTxs)
      .filter((u) => u.status !== 'ok')
      .sort((a, b) => b.spent * a.limit - a.spent * b.limit)[0];
    return worst ? { ...worst, percent: usagePercent(worst.spent, worst.limit) } : null;
  }, [budgets, monthTxs]);

  const segments = useMemo(() => {
    const top = byCategory.slice(0, TOP_CATEGORIES).map((c) => ({
      key: c.categoryId,
      label: categoryName(categories.get(c.categoryId)),
      color: categories.get(c.categoryId)?.color ?? colors.textMuted,
      amount: c.amount,
    }));
    const rest = byCategory.slice(TOP_CATEGORIES).reduce((s, c) => s + c.amount, 0);
    if (rest > 0) top.push({ key: 'others', label: t('dashboard.analysis.others'), color: colors.textFaint, amount: rest });
    return top;
  }, [byCategory, categories, categoryName, colors, t]);

  const legacy = useLegacyImport((s) => s.data);

  function confirmImport() {
    if (!legacy) return;
    Alert.alert(t('dashboard.legacy.title'), t('dashboard.legacy.body', { count: legacy.transactions.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('dashboard.legacy.import'),
        style: 'destructive',
        onPress: () => importLegacyData().catch(() => Alert.alert(t('common.error'), t('storage.saveFailed'))),
      },
    ]);
  }

  return (
    <TabPage>
      <Screen>
        <SigningExpiryBanner />

        {legacy && (
          <Card>
            <AppText weight="600">{t('dashboard.legacy.title')}</AppText>
            <AppText tone="muted" size={14}>
              {t('dashboard.legacy.body', { count: legacy.transactions.length })}
            </AppText>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button compact variant="secondary" label={t('dashboard.legacy.dismiss')} onPress={dismissLegacyImport} />
              </View>
              <View style={styles.flex}>
                <Button compact label={t('dashboard.legacy.import')} onPress={confirmImport} />
              </View>
            </View>
          </Card>
        )}

        <PageTitle eyebrow={monthLabel(month)} title={t('dashboard.title')} />

        <HeroCard>
          <View style={styles.between}>
            <AppText tone="onHeroMuted" size={14} weight="500">
              {t('dashboard.balance')}
            </AppText>
            {budgetStatus && (
              <Pressable
                onPress={() => router.navigate('/budget')}
                accessibilityRole="button"
                style={[styles.heroChip, { backgroundColor: colors.heroPanel }]}
              >
                <Ionicons
                  name={budgetStatus === 'ok' ? 'shield-checkmark-outline' : 'warning-outline'}
                  size={13}
                  color={colors.onHero}
                />
                <AppText tone="onHero" size={12} weight="600">
                  {t(`dashboard.budgetStatus.${budgetStatus}`)}
                </AppText>
              </Pressable>
            )}
          </View>
          <AppText tone="onHero" size={34} weight="700" tabular adjustsFontSizeToFit numberOfLines={1}>
            {money(balance)}
          </AppText>
          <View style={styles.row}>
            <HeroStat icon="arrow-down" label={t('dashboard.monthIncome')} value={signedMoney(summary.income)} />
            <HeroStat icon="arrow-up" label={t('dashboard.monthExpense')} value={signedMoney(-summary.expense)} />
          </View>
        </HeroCard>

        <View style={styles.quickRow}>
          <QuickAction icon="add-circle-outline" label={t('dashboard.quick.add')} onPress={() => router.push('/transaction')} />
          <QuickAction icon="pie-chart-outline" label={t('dashboard.quick.budget')} onPress={() => router.navigate('/budget')} />
          <QuickAction icon="bar-chart-outline" label={t('dashboard.quick.report')} onPress={() => router.push('/report')} />
          <QuickAction icon="wallet-outline" label={t('dashboard.quick.wallets')} onPress={() => router.push('/wallets')} />
        </View>

        {alert && (
          <Card onPress={() => router.navigate('/budget')}>
            <View style={styles.alertHead}>
              <View style={[styles.alertIcon, { backgroundColor: alert.status === 'over' ? colors.dangerSoft : colors.warningSoft }]}>
                <Ionicons name="warning-outline" size={20} color={alert.status === 'over' ? colors.danger : colors.warning} />
              </View>
              <View style={styles.flex}>
                <AppText weight="600">
                  {t('dashboard.alert.title', { category: categoryName(categories.get(alert.categoryId)) })}
                </AppText>
                <AppText tone="muted" size={13}>
                  {t('dashboard.alert.spentOf', { percent: alert.percent })}
                </AppText>
              </View>
              <Badge
                label={`${alert.percent}%`}
                color={alert.status === 'over' ? colors.danger : colors.warning}
                background={alert.status === 'over' ? colors.dangerSoft : colors.warningSoft}
              />
            </View>
            <ProgressBar ratio={alert.spent / alert.limit} color={alert.status === 'over' ? colors.danger : colors.warning} />
            <View style={styles.between}>
              <AppText tone="muted" size={13}>
                {t('dashboard.alert.used')}:{' '}
                <AppText size={13} weight="600" tabular>
                  {money(alert.spent)}
                </AppText>
              </AppText>
              <AppText tone="muted" size={13}>
                {t('dashboard.alert.limit')}:{' '}
                <AppText size={13} weight="600" tabular>
                  {money(alert.limit)}
                </AppText>
              </AppText>
            </View>
          </Card>
        )}

        {(debtSummary.owedToMe > 0 || debtSummary.iOwe > 0) && (
          <Card onPress={() => router.push('/debts')}>
            <SectionHeader title={t('dashboard.debts.title')} />
            <View style={styles.row}>
              <Pressable
                style={styles.flex}
                onPress={() => router.push({ pathname: '/debts', params: { direction: 'lent' } })}
                accessibilityRole="button"
              >
                <AppText tone="muted" size={13}>
                  {t('dashboard.debts.owedToMe')}
                </AppText>
                <AppText weight="600" size={17} tabular tone="income" numberOfLines={1} adjustsFontSizeToFit>
                  {money(debtSummary.owedToMe)}
                </AppText>
              </Pressable>
              <Pressable
                style={styles.flex}
                onPress={() => router.push({ pathname: '/debts', params: { direction: 'borrowed' } })}
                accessibilityRole="button"
              >
                <AppText tone="muted" size={13}>
                  {t('dashboard.debts.iOwe')}
                </AppText>
                <AppText weight="600" size={17} tabular tone="expense" numberOfLines={1} adjustsFontSizeToFit>
                  {money(debtSummary.iOwe)}
                </AppText>
              </Pressable>
            </View>
          </Card>
        )}

        <Card>
          <SectionHeader
            title={t('dashboard.analysis.title')}
            subtitle={t('dashboard.analysis.subtitle', { month: monthLabel(month) })}
            actionLabel={summary.expense > 0 ? t('report.title') : undefined}
            onAction={() => router.push('/report')}
          />
          {summary.expense === 0 ? (
            <AppText tone="muted">{t('dashboard.analysis.empty')}</AppText>
          ) : (
            <>
              <View style={styles.stacked}>
                {segments.map((s) => (
                  <View key={s.key} style={[styles.segment, { flex: s.amount, backgroundColor: s.color }]} />
                ))}
              </View>
              <View style={styles.between}>
                <AppText tone="muted" size={13}>
                  {t('dashboard.analysis.total')}
                </AppText>
                <AppText size={13} weight="600" tabular>
                  {money(summary.expense)}
                </AppText>
              </View>
              <View style={styles.legend}>
                {segments.map((s) => (
                  <View key={s.key} style={[styles.legendItem, { borderColor: colors.border }]}>
                    <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                    <AppText size={13} numberOfLines={1} style={styles.flex}>
                      {s.label}
                    </AppText>
                    <AppText size={13} weight="600" tabular>
                      {Math.round((s.amount * 100) / summary.expense)}%
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>

        <Card style={styles.listCard}>
          <View style={styles.listHeader}>
            <SectionHeader
              title={t('dashboard.recent')}
              actionLabel={recent.length ? t('common.seeAll') : undefined}
              onAction={() => router.navigate('/transactions')}
            />
          </View>
          {recent.length === 0 ? (
            <EmptyState icon="receipt-outline" message={t('dashboard.recentEmpty')} />
          ) : (
            recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                categories={categories}
                wallets={walletMap}
                showDate
                onPress={() => router.push({ pathname: '/transaction', params: { id: tx.id } })}
              />
            ))
          )}
        </Card>
      </Screen>
    </TabPage>
  );
}

function HeroStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.heroStat, { backgroundColor: colors.heroPanel }]}>
      <View style={styles.heroStatLabel}>
        <Ionicons name={icon} size={14} color={colors.onHeroMuted} />
        <AppText tone="onHeroMuted" size={13} numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <AppText tone="onHero" size={17} weight="700" tabular adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress(): void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.quick, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconCircle icon={icon} color={colors.primary} size={48} />
      </View>
      <AppText size={12} weight="500" numberOfLines={2} style={styles.quickLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', gap: spacing.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  heroStat: { flex: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  heroStatLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quick: { flex: 1, alignItems: 'center', gap: spacing.sm },
  quickIcon: { borderRadius: 32, borderWidth: StyleSheet.hairlineWidth, padding: 6 },
  quickLabel: { textAlign: 'center' },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stacked: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 3 },
  segment: { height: '100%', borderRadius: 5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  legendItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  listCard: { paddingHorizontal: 0, paddingBottom: spacing.sm, gap: 0 },
  listHeader: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});
