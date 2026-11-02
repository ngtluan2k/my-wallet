import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, IconCircle, ProgressBar, Screen, SegmentedControl } from '@/components/ui';
import { useCategories } from '@/components/wallet';
import { addDays, addMonths, monthOf, startOfWeek, today } from '@/domain/dates';
import { monthlyReport, weeklyReport } from '@/domain/reports';
import type { CategoryTotal } from '@/domain/transactions';
import { useT, type TranslationKey } from '@/i18n';
import { useTransactions } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

const CHART_HEIGHT = 120;

type Mode = 'week' | 'month';

/** Weekly (Mon–Sun) or monthly report. Transfers are excluded throughout. */
export default function ReportScreen() {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('week');
  return (
    <Screen>
      <SegmentedControl<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'week', label: t('report.mode.week') },
          { value: 'month', label: t('report.mode.month') },
        ]}
      />
      {mode === 'week' ? <WeekView /> : <MonthView />}
    </Screen>
  );
}

function WeekView() {
  const { t, money, dayMonth, weekdayShort } = useT();
  const { colors } = useTheme();
  const transactions = useTransactions();
  const todayDate = today();
  const currentWeek = startOfWeek(todayDate);
  const [weekStart, setWeekStart] = useState(currentWeek);
  const report = useMemo(() => weeklyReport(transactions, weekStart), [transactions, weekStart]);
  const maxDay = Math.max(...report.days.map((d) => d.expense), 1);

  return (
    <>
      <PeriodSwitcher
        caption={weekStart === currentWeek ? t('report.thisWeek') : undefined}
        label={t('report.range', { start: dayMonth(report.start), end: dayMonth(report.end) })}
        onPrevious={() => setWeekStart(addDays(weekStart, -7))}
        onNext={weekStart < currentWeek ? () => setWeekStart(addDays(weekStart, 7)) : undefined}
      />
      <Totals income={report.income} expense={report.expense} />

      <Card>
        <AppText size={17} weight="600">
          {t('report.byDay')}
        </AppText>
        <View style={styles.chart} accessibilityRole="image">
          {report.days.map((d) => {
            const isToday = d.date === todayDate;
            return (
              <Bar
                key={d.date}
                label={weekdayShort(d.date)}
                value={d.expense}
                max={maxDay}
                highlight={isToday}
                color={isToday ? colors.primary : colors.expense}
                accessibilityLabel={`${weekdayShort(d.date)} ${money(d.expense)}`}
              />
            );
          })}
        </View>
        <Comparison change={report.expenseChangePercent} period="week" />
      </Card>

      <TopCategories items={report.topCategories} total={report.expense} empty={t('report.empty')} />
    </>
  );
}

function MonthView() {
  const { t, money, month: monthLabel } = useT();
  const { colors } = useTheme();
  const transactions = useTransactions();
  const currentMonth = monthOf(today());
  const [month, setMonth] = useState(currentMonth);
  const report = useMemo(() => monthlyReport(transactions, month), [transactions, month]);
  const maxMonth = Math.max(...report.trend.map((m) => Math.max(m.expense, m.income)), 1);

  return (
    <>
      <PeriodSwitcher
        caption={month === currentMonth ? t('report.thisMonth') : undefined}
        label={monthLabel(month)}
        onPrevious={() => setMonth(addMonths(month, -1))}
        onNext={month < currentMonth ? () => setMonth(addMonths(month, 1)) : undefined}
      />
      <Totals income={report.income} expense={report.expense} />

      {report.savingsRate !== null && (
        <Card>
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText weight="600">{t('report.savingsRate')}</AppText>
              <AppText tone="muted" size={13}>
                {t('report.savingsHint')}
              </AppText>
            </View>
            <AppText size={24} weight="700" tabular tone={report.savingsRate < 0 ? 'expense' : 'income'}>
              {report.savingsRate}%
            </AppText>
          </View>
          <ProgressBar
            ratio={Math.max(report.savingsRate, 0) / 100}
            color={report.savingsRate < 0 ? colors.danger : colors.primary}
          />
        </Card>
      )}

      <Card>
        <AppText size={17} weight="600">
          {t('report.trend', { count: report.trend.length })}
        </AppText>
        <View style={styles.chart} accessibilityRole="image">
          {report.trend.map((m) => (
            <Bar
              key={m.month}
              label={t('report.monthLabel', { month: Number(m.month.slice(5)) })}
              value={m.expense}
              max={maxMonth}
              highlight={m.month === month}
              color={m.month === month ? colors.primary : colors.expense}
              marker={m.income}
              markerColor={colors.income}
              accessibilityLabel={`${monthLabel(m.month)}: ${t('summary.income')} ${money(m.income)}, ${t('summary.expense')} ${money(m.expense)}`}
            />
          ))}
        </View>
        <View style={styles.legend}>
          <LegendDot color={colors.expense} label={t('summary.expense')} />
          <LegendDot color={colors.income} label={t('summary.income')} />
        </View>
        <Comparison change={report.expenseChangePercent} period="month" />
      </Card>

      <TopCategories items={report.topCategories} total={report.expense} empty={t('report.monthEmpty')} />
    </>
  );
}

function PeriodSwitcher({
  caption,
  label,
  onPrevious,
  onNext,
}: {
  caption?: string;
  label: string;
  onPrevious(): void;
  /** Absent for the current period: reports never go into the future. */
  onNext?: () => void;
}) {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <View style={styles.periodRow}>
      <Pressable onPress={onPrevious} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('report.previous')}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <View style={styles.center}>
        {caption && (
          <AppText tone="primary" size={12} weight="600">
            {caption}
          </AppText>
        )}
        <AppText size={17} weight="600">
          {label}
        </AppText>
      </View>
      <Pressable
        onPress={onNext}
        disabled={!onNext}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('report.next')}
        style={!onNext && styles.disabled}
      >
        <Ionicons name="chevron-forward" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

function Totals({ income, expense }: { income: number; expense: number }) {
  const { t, signedMoney } = useT();
  return (
    <View style={styles.row}>
      <Card style={styles.flex}>
        <AppText tone="muted" size={13}>
          {t('summary.income')}
        </AppText>
        <AppText tone="income" size={18} weight="700" tabular adjustsFontSizeToFit numberOfLines={1}>
          {signedMoney(income)}
        </AppText>
      </Card>
      <Card style={styles.flex}>
        <AppText tone="muted" size={13}>
          {t('summary.expense')}
        </AppText>
        <AppText tone="expense" size={18} weight="700" tabular adjustsFontSizeToFit numberOfLines={1}>
          {signedMoney(-expense)}
        </AppText>
      </Card>
    </View>
  );
}

function Bar({
  label,
  value,
  max,
  highlight,
  color,
  marker,
  markerColor,
  accessibilityLabel,
}: {
  label: string;
  value: number;
  max: number;
  highlight: boolean;
  color: string;
  /** Optional second value drawn as a thin bar beside the main one (income in the trend). */
  marker?: number;
  markerColor?: string;
  accessibilityLabel: string;
}) {
  const height = (v: number) => (v ? Math.max((v / max) * CHART_HEIGHT, 4) : 0);
  return (
    <View style={styles.bar} accessibilityLabel={accessibilityLabel}>
      <View style={styles.barTrack}>
        <View style={[marker !== undefined ? styles.barFillPaired : styles.barFill, { height: height(value), backgroundColor: color }]} />
        {marker !== undefined && <View style={[styles.barMarker, { height: height(marker), backgroundColor: markerColor }]} />}
      </View>
      <AppText size={12} weight={highlight ? '700' : '500'} tone={highlight ? 'primary' : 'muted'}>
        {label}
      </AppText>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText tone="muted" size={12}>
        {label}
      </AppText>
    </View>
  );
}

function Comparison({ change, period }: { change: number | null; period: Mode }) {
  const { t } = useT();
  const { colors } = useTheme();
  const key = (suffix: string) => `report.${period}.${suffix}` as TranslationKey;
  const text =
    change === null
      ? t(key('noPrevious'))
      : change > 0
        ? t(key('more'), { percent: change })
        : change < 0
          ? t(key('less'), { percent: -change })
          : t(key('same'));
  return (
    <View style={[styles.compare, { backgroundColor: colors.surfaceMuted }]}>
      <Ionicons
        name={change !== null && change > 0 ? 'trending-up' : 'trending-down'}
        size={18}
        color={change !== null && change > 0 ? colors.expense : colors.income}
      />
      <AppText size={14} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

function TopCategories({ items, total, empty }: { items: CategoryTotal[]; total: number; empty: string }) {
  const { t, money, categoryName } = useT();
  const { colors } = useTheme();
  const categories = useCategories();
  return (
    <Card>
      <AppText size={17} weight="600">
        {t('report.topCategories')}
      </AppText>
      {items.length === 0 ? (
        <EmptyState icon="bar-chart-outline" message={empty} />
      ) : (
        items.map((c) => {
          const category = categories.get(c.categoryId);
          return (
            <View key={c.categoryId} style={styles.topRow}>
              <IconCircle icon={category?.icon ?? 'help'} color={category?.color ?? colors.textMuted} size={36} />
              <View style={styles.flex}>
                <View style={styles.between}>
                  <AppText weight="500" numberOfLines={1} style={styles.flex}>
                    {categoryName(category)}
                  </AppText>
                  <AppText weight="600" tabular>
                    {money(c.amount)}
                  </AppText>
                </View>
                <ProgressBar ratio={c.amount / total} color={category?.color ?? colors.textMuted} height={6} />
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { alignItems: 'center' },
  disabled: { opacity: 0.3 },
  row: { flexDirection: 'row', gap: spacing.sm },
  between: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 6 },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  bar: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    height: CHART_HEIGHT,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  barFill: { width: '70%', borderRadius: radius.sm / 2 },
  barFillPaired: { width: '40%', borderRadius: radius.sm / 2 },
  barMarker: { width: '25%', borderRadius: radius.sm / 2 },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  compare: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
