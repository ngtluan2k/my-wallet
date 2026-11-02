import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, IconCircle, ProgressBar, Screen } from '@/components/ui';
import { useCategories } from '@/components/wallet';
import { addDays, startOfWeek, today } from '@/domain/dates';
import { weeklyReport } from '@/domain/reports';
import { useT } from '@/i18n';
import { useTransactions } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

const CHART_HEIGHT = 120;

export default function WeeklyReportScreen() {
  const { t, money, signedMoney, dayMonth, weekdayShort, categoryName } = useT();
  const { colors } = useTheme();
  const transactions = useTransactions();
  const categories = useCategories();
  const currentWeek = startOfWeek(today());
  const [weekStart, setWeekStart] = useState(currentWeek);
  const report = useMemo(() => weeklyReport(transactions, weekStart), [transactions, weekStart]);
  const maxDay = Math.max(...report.days.map((d) => d.expense), 1);
  const todayDate = today();

  const change = report.expenseChangePercent;
  const comparison =
    change === null
      ? t('report.noPrevious')
      : change > 0
        ? t('report.more', { percent: change })
        : change < 0
          ? t('report.less', { percent: -change })
          : t('report.same');

  return (
    <Screen>
      <View style={styles.weekRow}>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} hitSlop={12} accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.center}>
          {weekStart === currentWeek && (
            <AppText tone="primary" size={12} weight="600">
              {t('report.thisWeek')}
            </AppText>
          )}
          <AppText size={17} weight="600">
            {t('report.range', { start: dayMonth(report.start), end: dayMonth(report.end) })}
          </AppText>
        </View>
        <Pressable
          onPress={() => setWeekStart(addDays(weekStart, 7))}
          disabled={weekStart >= currentWeek}
          hitSlop={12}
          accessibilityRole="button"
          style={weekStart >= currentWeek && styles.disabled}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <Card style={styles.flex}>
          <AppText tone="muted" size={13}>
            {t('summary.income')}
          </AppText>
          <AppText tone="income" size={18} weight="700" tabular adjustsFontSizeToFit numberOfLines={1}>
            {signedMoney(report.income)}
          </AppText>
        </Card>
        <Card style={styles.flex}>
          <AppText tone="muted" size={13}>
            {t('summary.expense')}
          </AppText>
          <AppText tone="expense" size={18} weight="700" tabular adjustsFontSizeToFit numberOfLines={1}>
            {signedMoney(-report.expense)}
          </AppText>
        </Card>
      </View>

      <Card>
        <AppText size={17} weight="600">
          {t('report.byDay')}
        </AppText>
        <View style={styles.chart} accessibilityRole="image">
          {report.days.map((d) => {
            const isToday = d.date === todayDate;
            return (
              <View key={d.date} style={styles.bar} accessibilityLabel={`${weekdayShort(d.date)} ${money(d.expense)}`}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: d.expense ? Math.max((d.expense / maxDay) * CHART_HEIGHT, 4) : 0,
                        backgroundColor: isToday ? colors.primary : colors.expense,
                      },
                    ]}
                  />
                </View>
                <AppText size={12} weight={isToday ? '700' : '500'} tone={isToday ? 'primary' : 'muted'}>
                  {weekdayShort(d.date)}
                </AppText>
              </View>
            );
          })}
        </View>
        <View style={[styles.compare, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons
            name={change !== null && change > 0 ? 'trending-up' : 'trending-down'}
            size={18}
            color={change !== null && change > 0 ? colors.expense : colors.income}
          />
          <AppText size={14} style={styles.flex}>
            {comparison}
          </AppText>
        </View>
      </Card>

      <Card>
        <AppText size={17} weight="600">
          {t('report.topCategories')}
        </AppText>
        {report.topCategories.length === 0 ? (
          <EmptyState icon="bar-chart-outline" message={t('report.empty')} />
        ) : (
          report.topCategories.map((c) => {
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
                  <ProgressBar ratio={c.amount / report.expense} color={category?.color ?? colors.textMuted} height={6} />
                </View>
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { alignItems: 'center' },
  disabled: { opacity: 0.3 },
  row: { flexDirection: 'row', gap: spacing.sm },
  between: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 6 },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  bar: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { height: CHART_HEIGHT, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  barFill: { width: '70%', borderRadius: radius.sm / 2 },
  compare: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
