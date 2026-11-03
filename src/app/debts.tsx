import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FadeIn, useCountUp } from '@/components/motion';
import { AppText, Badge, Button, Card, EmptyState, IconCircle, ListGroup, Screen, SegmentedControl } from '@/components/ui';
import { debtTotals, isSettled, sortDebts } from '@/domain/debts';
import type { Debt, DebtDirection } from '@/domain/types';
import { useT } from '@/i18n';
import { useDebts, useWallets } from '@/state/wallet';
import { spacing, useTheme } from '@/theme';

/** Debts: money others owe the user and money the user owes, open ones first. */
export default function DebtsScreen() {
  const params = useLocalSearchParams<{ direction?: string }>();
  const { t, money } = useT();
  const { colors } = useTheme();
  const debts = useDebts();
  const [direction, setDirection] = useState<DebtDirection>(params.direction === 'borrowed' ? 'borrowed' : 'lent');

  const totals = useMemo(() => debtTotals(debts), [debts]);
  const shown = useMemo(() => sortDebts(debts.filter((d) => d.direction === direction)), [debts, direction]);
  const open = useCountUp(direction === 'lent' ? totals.owedToMe : totals.iOwe);
  const add = () => router.push({ pathname: '/transaction', params: { mode: 'debt', direction } });

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={add} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('debt.add')}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        <AppText tone="muted" size={14}>
          {t('debt.intro')}
        </AppText>
        <SegmentedControl<DebtDirection>
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'lent', label: t('debt.tab.lent'), color: colors.debt },
            { value: 'borrowed', label: t('debt.tab.borrowed'), color: colors.debt },
          ]}
        />
        <Card style={{ backgroundColor: colors.debtSoft, borderColor: colors.debt }}>
          <View style={styles.totalHead}>
            <Ionicons name={direction === 'lent' ? 'arrow-up-circle' : 'arrow-down-circle'} size={18} color={colors.debt} />
            <AppText tone="debt" size={14} weight="600">
              {direction === 'lent' ? t('debt.totalOpen') : t('debt.totalOpenBorrowed')}
            </AppText>
          </View>
          <AppText size={28} weight="700" tabular tone="debt" adjustsFontSizeToFit numberOfLines={1}>
            {money(open)}
          </AppText>
        </Card>
        {shown.length === 0 ? (
          <EmptyState icon="people-outline" message={direction === 'lent' ? t('debt.empty.lent') : t('debt.empty.borrowed')} />
        ) : (
          <FadeIn key={direction} offset={8}>
            <ListGroup>
              {shown.map((d) => (
                <DebtRow key={d.id} debt={d} />
              ))}
            </ListGroup>
          </FadeIn>
        )}
        <Button variant="secondary" icon="add" label={t('debt.add')} onPress={add} />
      </Screen>
    </>
  );
}

function DebtRow({ debt }: { debt: Debt }) {
  const { t, money, relativeDate } = useT();
  const { colors } = useTheme();
  const wallet = useWallets().find((w) => w.id === debt.walletId);
  const settled = isSettled(debt);
  const lent = debt.direction === 'lent';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/debt-edit', params: { id: debt.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTint }, settled && styles.settled]}
    >
      <IconCircle icon={lent ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} color={colors.debt} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <AppText weight="600" size={16} numberOfLines={1} style={styles.shrink}>
            {debt.person}
          </AppText>
          {settled && <Badge label={t('debt.settledBadge')} color={colors.primary} background={colors.primarySoft} />}
        </View>
        <AppText tone="muted" size={13} numberOfLines={1}>
          {settled ? t('debt.settledOn', { date: relativeDate(debt.settledDate!) }) : relativeDate(debt.date)} · {wallet?.name ?? '?'}
        </AppText>
        {debt.note ? (
          <AppText tone="muted" size={13} numberOfLines={1}>
            {debt.note}
          </AppText>
        ) : null}
      </View>
      <AppText weight="600" tabular tone={settled ? 'muted' : 'debt'}>
        {money(debt.amount)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settled: { opacity: 0.6 },
  totalHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
