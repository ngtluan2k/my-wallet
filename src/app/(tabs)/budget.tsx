import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { TabPage } from '@/components/AppHeader';
import { AppText, Badge, Button, Card, HeroCard, IconCircle, PageTitle, ProgressBar, Screen } from '@/components/ui';
import { monthTransactions, useCategories } from '@/components/wallet';
import { budgetOverview, budgetUsage, usagePercent, type BudgetUsage } from '@/domain/budgets';
import { addMonths, today } from '@/domain/dates';
import { groupDigits, parseAmountInput } from '@/domain/money';
import type { Category } from '@/domain/types';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useBudgets, useTransactions, walletStore } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

type Sort = 'percent' | 'name';

export default function BudgetScreen() {
  const { t, money, categoryName } = useT();
  const { colors } = useTheme();
  const { month } = useSelectedMonth();
  const transactions = useTransactions();
  const budgets = useBudgets();
  const categories = useCategories();
  const [adjusting, setAdjusting] = useState(false);
  const [sort, setSort] = useState<Sort>('percent');

  const monthTxs = useMemo(() => monthTransactions(transactions, month), [transactions, month]);
  const overview = useMemo(() => budgetOverview(budgets, monthTxs, month, today()), [budgets, monthTxs, month]);
  const usage = useMemo(() => {
    const rows = budgetUsage(budgets, monthTxs);
    const name = (u: BudgetUsage) => categoryName(categories.get(u.categoryId));
    return sort === 'name'
      ? rows.sort((a, b) => name(a).localeCompare(name(b)))
      : rows.sort((a, b) => b.spent * a.limit - a.spent * b.limit);
  }, [budgets, monthTxs, sort, categories, categoryName]);
  const expenseCategories = useMemo(() => [...categories.values()].filter((c) => c.type === 'expense'), [categories]);
  const limits = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b.limit])), [budgets]);

  const overColor = overview.status === 'over' ? colors.danger : overview.status === 'warning' ? colors.warning : colors.onHero;

  return (
    <TabPage>
      <Screen>
        <PageTitle title={t('budget.title')} />
        <MonthTabs />

        <HeroCard>
          <View style={styles.between}>
            <AppText tone="onHeroMuted" size={12} weight="600" style={styles.caps}>
              {t('budget.overview.label')}
            </AppText>
            {overview.daysLeft !== null && (
              <View style={[styles.heroChip, { backgroundColor: colors.heroPanel }]}>
                <Ionicons name="calendar-outline" size={12} color={colors.onHero} />
                <AppText tone="onHero" size={12} weight="600">
                  {t('budget.overview.daysLeft', { days: overview.daysLeft })}
                </AppText>
              </View>
            )}
          </View>
          <View style={styles.between}>
            <AppText tone="onHero" size={32} weight="700" tabular adjustsFontSizeToFit numberOfLines={1} style={styles.flex}>
              {money(Math.abs(overview.remaining))}
            </AppText>
            {overview.limit > 0 && (
              <View style={[styles.heroChip, { backgroundColor: colors.heroPanel }]}>
                <AppText size={13} weight="700" style={{ color: overColor }}>
                  {overview.percent}%
                </AppText>
              </View>
            )}
          </View>
          <AppText tone="onHeroMuted" size={14}>
            {overview.remaining < 0 ? t('budget.overview.overHint') : t('budget.overview.remainingHint')}
          </AppText>
          {overview.limit > 0 && (
            <ProgressBar ratio={overview.spent / overview.limit} color={overview.status === 'ok' ? colors.onHero : overColor} />
          )}
          <View style={[styles.heroSplit, { borderTopColor: colors.heroPanel }]}>
            <View style={styles.flex}>
              <AppText tone="onHeroMuted" size={13}>
                {t('budget.overview.limit')}
              </AppText>
              <AppText tone="onHero" size={17} weight="700" tabular numberOfLines={1} adjustsFontSizeToFit>
                {money(overview.limit)}
              </AppText>
            </View>
            <View style={[styles.flex, styles.splitRight, { borderLeftColor: colors.heroPanel }]}>
              <AppText tone="onHeroMuted" size={13}>
                {t('budget.overview.spent')}
              </AppText>
              <AppText tone="onHero" size={17} weight="700" tabular numberOfLines={1} adjustsFontSizeToFit>
                {money(overview.spent)}
              </AppText>
            </View>
          </View>
          {overview.dailyAllowance !== null && overview.limit > 0 && (
            <View style={[styles.tip, { backgroundColor: colors.heroPanel }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.onHero} />
              <AppText tone="onHero" size={14} style={styles.flex}>
                {t('budget.overview.daily', { amount: money(overview.dailyAllowance) })}
              </AppText>
            </View>
          )}
        </HeroCard>

        {adjusting ? (
          <>
            <AppText tone="muted" size={14}>
              {t('budget.adjustHint')}
            </AppText>
            {expenseCategories.map((c) => (
              <LimitRow key={c.id} category={c} limit={limits.get(c.id)} />
            ))}
          </>
        ) : (
          <>
            <View style={styles.between}>
              <AppText size={20} weight="600" style={styles.flex}>
                {t('budget.section')}
              </AppText>
              {usage.length > 1 && (
                <Pressable
                  onPress={() => setSort((s) => (s === 'percent' ? 'name' : 'percent'))}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={styles.sortButton}
                >
                  <AppText tone="primary" size={13} weight="600">
                    {t(sort === 'percent' ? 'budget.sort.percent' : 'budget.sort.name')}
                  </AppText>
                  <Ionicons name="swap-vertical" size={16} color={colors.primary} />
                </Pressable>
              )}
            </View>
            {usage.length === 0 ? (
              <Card>
                <AppText tone="muted">{t('budget.overview.empty')}</AppText>
              </Card>
            ) : (
              usage.map((u) => <UsageCard key={u.categoryId} usage={u} category={categories.get(u.categoryId)} />)
            )}
          </>
        )}

        <Button
          variant={adjusting ? 'primary' : 'secondary'}
          icon={adjusting ? 'checkmark' : 'options-outline'}
          label={adjusting ? t('budget.adjustDone') : t('budget.adjust')}
          onPress={() => setAdjusting((a) => !a)}
        />
      </Screen>
    </TabPage>
  );
}

/** Previous / selected / next month. */
function MonthTabs() {
  const { month, setMonth } = useSelectedMonth();
  const { t } = useT();
  const { colors } = useTheme();
  const options = [-1, 0, 1].map((offset) => addMonths(month, offset));
  const label = (m: string, selected: boolean) =>
    selected ? t('date.month', { month: Number(m.slice(5)), year: m.slice(0, 4) }) : t('date.monthShort', { month: Number(m.slice(5)) });
  return (
    <View style={[styles.monthTabs, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      {options.map((m, i) => {
        const selected = i === 1;
        return (
          <Pressable
            key={m}
            onPress={() => setMonth(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.monthTab, selected && { backgroundColor: colors.surface }]}
          >
            {selected && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            <AppText size={14} weight={selected ? '600' : '500'} tone={selected ? 'primary' : 'muted'} numberOfLines={1}>
              {label(m, selected)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function UsageCard({ usage, category }: { usage: BudgetUsage; category: Category | undefined }) {
  const { t, money, categoryName } = useT();
  const { colors } = useTheme();
  const percent = usagePercent(usage.spent, usage.limit);
  const full = usage.spent === usage.limit;
  const over = usage.status === 'over';
  const barColor = over ? colors.danger : full ? colors.transfer : usage.status === 'warning' ? colors.warning : colors.primary;
  const badge = over
    ? { label: t('budget.status.over', { amount: money(usage.spent - usage.limit), percent }), color: colors.danger, bg: colors.dangerSoft }
    : full
      ? { label: t('budget.status.full'), color: colors.transfer, bg: colors.transferSoft }
      : usage.status === 'warning'
        ? { label: t('budget.status.warning', { percent }), color: colors.warning, bg: colors.warningSoft }
        : { label: t('budget.status.ok', { percent }), color: colors.primary, bg: colors.primarySoft };

  return (
    <Card style={over && { borderColor: colors.danger, backgroundColor: colors.dangerSoft }}>
      <View style={styles.cardHead}>
        <IconCircle icon={category?.icon ?? 'help'} color={over ? colors.danger : (category?.color ?? colors.textMuted)} />
        <View style={styles.flex}>
          <AppText size={17} weight="600" numberOfLines={1}>
            {categoryName(category)}
          </AppText>
          <AppText tone="muted" size={13}>
            {t('budget.limit', { amount: money(usage.limit) })}
          </AppText>
        </View>
        <Badge label={badge.label} color={badge.color} background={badge.bg} />
      </View>
      <ProgressBar ratio={usage.spent / usage.limit} color={barColor} />
      <View style={styles.between}>
        <AppText tone="muted" size={13}>
          {t('budget.spent')}:{' '}
          <AppText size={13} weight="700" tone={over ? 'danger' : 'default'} tabular>
            {money(usage.spent)}
          </AppText>
        </AppText>
        {over ? (
          <AppText tone="danger" size={13} weight="600">
            {t('budget.overLabel')}
          </AppText>
        ) : (
          <AppText tone="muted" size={13}>
            {t('budget.remaining')}:{' '}
            <AppText size={13} weight="700" tone={usage.status === 'warning' ? 'warning' : 'primary'} tabular>
              {money(usage.remaining)}
            </AppText>
          </AppText>
        )}
      </View>
    </Card>
  );
}

/** Editable monthly limit for one expense category. Empty removes the limit. */
function LimitRow({ category, limit }: { category: Category; limit: number | undefined }) {
  const { t, categoryName } = useT();
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

  return (
    <Card style={styles.limitRow}>
      <IconCircle icon={category.icon} color={category.color} size={36} />
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
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={categoryName(category)}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceMuted }]}
      />
      <AppText tone="muted">₫</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  caps: { textTransform: 'uppercase', letterSpacing: 0.6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  heroSplit: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.md },
  splitRight: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.md },
  tip: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthTabs: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, padding: 4 },
  monthTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  input: {
    minWidth: 120,
    textAlign: 'right',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 16,
  },
});
