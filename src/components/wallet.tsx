import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addMonths, today } from '@/domain/dates';
import type { Category, CategoryType, MonthKey, Transaction, Wallet } from '@/domain/types';
import { activeWallets } from '@/domain/wallets';
import { useT } from '@/i18n';
import { syncNow, useSync } from '@/state/session';
import { useSelectedMonth } from '@/state/ui';
import { useWallet, useWallets } from '@/state/wallet';
import { radius, spacing, tint, useTheme } from '@/theme';

import { AppText, Button, IconCircle, Sheet, type IconName } from './ui';

export function useCategories(): Map<string, Category> {
  const categories = useWallet((s) => s.data?.categories);
  return useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
}

export function useWalletMap(): Map<string, Wallet> {
  const wallets = useWallets();
  return useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);
}

/** Month picker card: ‹ Tháng này (Tháng 10/2026) ›. */
export function MonthSwitcher({ children }: { children?: ReactNode }) {
  const { month, setMonth } = useSelectedMonth();
  const { t, month: monthLabel } = useT();
  const { colors } = useTheme();
  const current = today().slice(0, 7);
  const label = month === current ? `${t('date.thisMonth')} (${monthLabel(month)})` : monthLabel(month);
  return (
    <View style={styles.monthRow}>
      <Pressable
        onPress={() => setMonth(addMonths(month, -1))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={monthLabel(addMonths(month, -1))}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => setMonth(current)} style={styles.monthLabel} accessibilityRole="button">
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <AppText size={17} weight="600" numberOfLines={1}>
          {label}
        </AppText>
      </Pressable>
      <Pressable
        onPress={() => setMonth(addMonths(month, 1))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={monthLabel(addMonths(month, 1))}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
      {children}
    </View>
  );
}

export function categoryIcon(category: Category | undefined): string {
  return category?.icon ?? 'help';
}

export function TransactionRow({
  transaction,
  categories,
  wallets,
  showDate,
  onPress,
}: {
  transaction: Transaction;
  categories: Map<string, Category>;
  wallets: Map<string, Wallet>;
  /** Show the date in the subtitle (lists not grouped by day). */
  showDate?: boolean;
  onPress(): void;
}) {
  const { t, categoryName, money, relativeDate } = useT();
  const { colors } = useTheme();
  const category = transaction.categoryId ? categories.get(transaction.categoryId) : undefined;
  const wallet = wallets.get(transaction.walletId);
  const isTransfer = transaction.type === 'transfer';

  const title = isTransfer
    ? t('transactions.transferTitle', {
        from: wallet?.name ?? '?',
        to: wallets.get(transaction.toWalletId ?? '')?.name ?? '?',
      })
    : transaction.note || categoryName(category);
  const label = isTransfer ? t('type.transfer') : categoryName(category);
  const when = [showDate ? relativeDate(transaction.transactionDate) : null, transaction.transactionTime]
    .filter(Boolean)
    .join(', ');
  const subtitle = [isTransfer && transaction.note ? transaction.note : label, when].filter(Boolean).join(' • ');

  const sign = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : '';
  const tone = transaction.type === 'income' ? 'income' : transaction.type === 'expense' ? 'expense' : 'transfer';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.txRow, pressed && { backgroundColor: colors.surfaceTint }]}
    >
      <IconCircle
        icon={isTransfer ? 'swap-horizontal' : categoryIcon(category)}
        color={isTransfer ? colors.transfer : (category?.color ?? colors.textMuted)}
      />
      <View style={styles.txText}>
        <AppText weight="500" size={16} numberOfLines={1}>
          {title}
        </AppText>
        <AppText tone="muted" size={13} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <View style={styles.txAmount}>
        <AppText weight="600" size={16} tone={tone} tabular numberOfLines={1}>
          {sign}
          {money(transaction.amount)}
        </AppText>
        {!isTransfer && wallet && (
          <AppText tone="muted" size={12} numberOfLines={1}>
            {wallet.name}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

/** Real sync state; tapping retries. */
export function SyncStatus() {
  const { status, pending } = useSync();
  const { t } = useT();
  const { colors } = useTheme();
  const { label, color, icon } =
    status === 'syncing'
      ? { label: t('sync.syncing'), color: colors.textMuted, icon: 'sync' as const }
      : status === 'error'
        ? { label: t('sync.error'), color: colors.warning, icon: 'cloud-offline-outline' as const }
        : pending > 0
          ? { label: t('sync.pending', { count: pending }), color: colors.warning, icon: 'cloud-upload-outline' as const }
          : { label: t('sync.synced'), color: colors.primary, icon: 'cloud-done-outline' as const };
  return (
    <Pressable
      onPress={() => void syncNow()}
      disabled={status === 'syncing'}
      accessibilityRole="button"
      style={[styles.syncChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Ionicons name={icon} size={14} color={color} />
      <AppText size={12} weight="500" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Grid of category tiles; the selected one gets an outline and a check. */
export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  trailing,
}: {
  categories: Category[];
  selectedId: string | undefined;
  onSelect(id: string): void;
  trailing?: ReactNode;
}) {
  const { categoryName } = useT();
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.gridItem,
              { borderColor: selected ? c.color : 'transparent', backgroundColor: selected ? tint(c.color, 0.08) : 'transparent' },
            ]}
          >
            <IconCircle icon={c.icon} color={c.color} size={44} />
            <AppText size={12} weight={selected ? '600' : '400'} tone={selected ? 'default' : 'muted'} numberOfLines={1}>
              {categoryName(c)}
            </AppText>
            {selected && (
              <View style={[styles.check, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
              </View>
            )}
          </Pressable>
        );
      })}
      {trailing}
    </View>
  );
}

/** Extra tile at the end of a CategoryGrid, e.g. "See all". */
export function GridTile({ icon, label, onPress }: { icon: IconName; label: string; onPress(): void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.gridItem, { borderColor: 'transparent' }]}>
      <View style={[styles.moreIcon, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={22} color={colors.textMuted} />
      </View>
      <AppText size={12} tone="muted" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function CategorySheet({
  visible,
  type,
  categories,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  type: CategoryType;
  categories: Category[];
  selectedId: string | undefined;
  onSelect(id: string): void;
  onClose(): void;
}) {
  const { t } = useT();
  return (
    <Sheet
      visible={visible}
      title={t(type === 'income' ? 'form.incomeCategories' : 'form.expenseCategories')}
      onClose={onClose}
    >
      <CategoryGrid
        categories={categories.filter((c) => c.type === type)}
        selectedId={selectedId}
        onSelect={(id) => {
          onSelect(id);
          onClose();
        }}
      />
    </Sheet>
  );
}

export function WalletSheet({
  visible,
  title,
  selectedId,
  excludeId,
  balances,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  selectedId: string | undefined;
  excludeId?: string;
  balances: Map<string, number>;
  onSelect(id: string): void;
  onClose(): void;
}) {
  const wallets = activeWallets(useWallets()).filter((w) => w.id !== excludeId);
  const { colors } = useTheme();
  const { t, money } = useT();
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {wallets.length === 0 && (
        <AppText tone="muted" style={styles.sheetHint}>
          {t('form.noOtherWallet')}
        </AppText>
      )}
      <View style={[styles.sheetList, wallets.length === 0 && styles.hidden, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {wallets.map((w, i) => (
          <Pressable
            key={w.id}
            onPress={() => {
              onSelect(w.id);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: w.id === selectedId }}
            style={({ pressed }) => [
              styles.walletOption,
              i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              pressed && { backgroundColor: colors.surfaceTint },
            ]}
          >
            <IconCircle icon={w.icon} color={w.color} size={36} />
            <View style={styles.txText}>
              <AppText weight="600">{w.name}</AppText>
              <AppText tone="muted" size={13} tabular>
                {money(balances.get(w.id) ?? 0)}
              </AppText>
            </View>
            {w.id === selectedId && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
          </Pressable>
        ))}
      </View>
      <Button
        variant="secondary"
        icon="add"
        label={t('wallets.add')}
        onPress={() => {
          onClose();
          router.push('/wallet-edit');
        }}
      />
    </Sheet>
  );
}

/** Day group heading in the ledger: "Hôm nay • 24 Tháng 10" … "−185.000 ₫". */
export function DayHeader({ date, net }: { date: string; net: number }) {
  const { relativeDate, dayMonth, weekday, signedMoney } = useT();
  const rel = relativeDate(date);
  const secondary = rel === dayMonth(date) ? weekday(date) : dayMonth(date);
  return (
    <View style={styles.dayHeader}>
      <AppText size={15} numberOfLines={1} style={styles.txText}>
        <AppText weight="600" size={15}>
          {rel}
        </AppText>
        <AppText tone="muted" size={14}>
          {'  •  '}
          {secondary}
        </AppText>
      </AppText>
      <AppText size={14} weight="600" tabular tone={net > 0 ? 'income' : net < 0 ? 'expense' : 'muted'}>
        {signedMoney(net)}
      </AppText>
    </View>
  );
}

export function monthTransactions(transactions: Transaction[], month: MonthKey): Transaction[] {
  return transactions.filter((t) => t.transactionDate.startsWith(month));
}

const styles = StyleSheet.create({
  sheetHint: { textAlign: 'center' },
  hidden: { display: 'none' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  monthLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.md },
  txText: { flex: 1, gap: 2, minWidth: 0 },
  txAmount: { alignItems: 'flex-end', gap: 2, maxWidth: '45%' },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  moreIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute',
    top: -2,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetList: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  walletOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
});
