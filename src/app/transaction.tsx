import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, SegmentedControl, Sheet, type IconName } from '@/components/ui';
import { CategoryGrid, CategorySheet, GridTile, useCategories, WalletSheet } from '@/components/wallet';
import { formatLocalDate, formatTime, toLocalDate, toPickerDate, today } from '@/domain/dates';
import { addAmount, appendDigits, removeLastDigit } from '@/domain/money';
import { vietnameseAmountWords } from '@/domain/numberWords';
import { MAX_NOTE_LENGTH, type TransactionError } from '@/domain/transactions';
import type { TransactionType } from '@/domain/types';
import { activeWallets, defaultWalletId, walletBalances } from '@/domain/wallets';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useDebts, useTransactions, useWallet, useWallets, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { radius, spacing, useTheme } from '@/theme';

const GRID_SIZE = 7;
const QUICK_AMOUNTS = [50_000, 100_000, 500_000];
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '000'],
] as const;

type Picker = 'category' | 'wallet' | 'toWallet' | 'date' | 'time' | null;

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useWallet((s) => (id ? s.data?.transactions.find((t) => t.id === id) : undefined));
  const { t, language, money, relativeDate } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const categoriesMap = useCategories();
  const categories = useMemo(() => [...categoriesMap.values()], [categoriesMap]);
  const wallets = useWallets();
  const transactions = useTransactions();
  const debts = useDebts();
  const balances = useMemo(() => walletBalances(wallets, transactions, debts), [wallets, transactions, debts]);

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(existing?.categoryId);
  const [walletId, setWalletId] = useState(existing?.walletId ?? defaultWalletId(wallets) ?? '');
  const [toWalletId, setToWalletId] = useState(existing?.toWalletId);
  const [date, setDate] = useState(existing?.transactionDate ?? today());
  const [time, setTime] = useState<string | undefined>(existing ? existing.transactionTime : formatTime(new Date()));
  const [note, setNote] = useState(existing?.note ?? '');
  const [picker, setPicker] = useState<Picker>(null);
  const [saving, setSaving] = useState(false);

  const typeCategories = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);
  // Keep the selected category visible even when it isn't among the first tiles.
  const gridCategories = useMemo(() => {
    const first = typeCategories.slice(0, GRID_SIZE);
    const selected = typeCategories.find((c) => c.id === categoryId);
    if (selected && !first.includes(selected)) first[GRID_SIZE - 1] = selected;
    return first;
  }, [typeCategories, categoryId]);

  const walletName = (wid: string | undefined) => wallets.find((w) => w.id === wid)?.name;
  const accent = type === 'income' ? colors.income : type === 'expense' ? colors.expense : colors.transfer;

  function changeType(next: TransactionType) {
    setType(next);
    if (next !== 'transfer' && categoriesMap.get(categoryId ?? '')?.type !== next) setCategoryId(undefined);
  }

  function pressKey(key: string) {
    if (key === 'C') setAmount(0);
    else setAmount((a) => appendDigits(a, key));
  }

  async function save() {
    if (saving) return;
    const input = {
      type,
      amount,
      walletId,
      toWalletId: type === 'transfer' ? toWalletId : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId,
      transactionDate: date,
      transactionTime: time,
      note,
    };
    setSaving(true);
    try {
      if (existing) await walletStore.getState().editTransaction(existing.id, input);
      else await walletStore.getState().addTransaction(input);
      useSelectedMonth.getState().setMonth(date.slice(0, 7));
      router.back();
    } catch (error) {
      const message =
        error instanceof ValidationError ? t(`form.error.${(error.errors as TransactionError[])[0]}`) : t('storage.saveFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert(t('transactions.delete'), t('transactions.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await walletStore.getState().deleteTransaction(existing.id);
            router.back();
          } catch {
            Alert.alert(t('common.error'), t('storage.saveFailed'));
          }
        },
      },
    ]);
  }

  function onPickDate(event: DateTimePickerEvent, value?: Date) {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type !== 'dismissed' && value) setDate(toLocalDate(value));
  }

  function onPickTime(event: DateTimePickerEvent, value?: Date) {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type !== 'dismissed' && value) setTime(formatTime(value));
  }

  const dateLabel = relativeDate(date) === formatLocalDate(date, language) ? formatLocalDate(date, language) : `${relativeDate(date)}, ${formatLocalDate(date, language)}`;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="muted">
            {t('common.cancel')}
          </AppText>
        </Pressable>
        <AppText size={18} weight="600">
          {t(existing ? 'transactions.edit' : 'transactions.add')}
        </AppText>
        <Pressable onPress={save} hitSlop={12} accessibilityRole="button" disabled={saving}>
          <AppText size={17} tone="primary" weight="600">
            {t('common.save')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SegmentedControl<TransactionType>
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: t('type.expense'), color: colors.expense },
            { value: 'income', label: t('type.income'), color: colors.income },
            { value: 'transfer', label: t('type.transfer'), color: colors.transfer },
          ]}
        />

        <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText tone="muted" size={12} weight="600" style={styles.caps}>
            {t('form.amount')}
          </AppText>
          <View style={styles.amountRow}>
            {type !== 'transfer' && (
              <AppText size={32} weight="700" style={{ color: accent }}>
                {type === 'expense' ? '−' : '+'}
              </AppText>
            )}
            <AppText size={40} weight="700" tabular adjustsFontSizeToFit numberOfLines={1} style={styles.amountText}>
              {money(amount)}
            </AppText>
          </View>
          {language === 'vi' && amount > 0 && (
            <AppText tone="muted" size={13} style={styles.words}>
              {vietnameseAmountWords(amount)}
            </AppText>
          )}
        </View>

        {type === 'transfer' && activeWallets(wallets).length < 2 && (
          <View style={[styles.card, styles.notice, { backgroundColor: colors.warningSoft, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
            <AppText size={14} style={styles.flex}>
              {t('form.transferNeedsWallet')}
            </AppText>
            <Button compact label={t('wallets.add')} onPress={() => router.push('/wallet-edit')} />
          </View>
        )}

        {type !== 'transfer' && (
          <View style={styles.section}>
            <AppText tone="muted" size={13} weight="600" style={styles.caps}>
              {t(type === 'income' ? 'form.incomeCategories' : 'form.expenseCategories')}
            </AppText>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <CategoryGrid
                categories={gridCategories}
                selectedId={categoryId}
                onSelect={setCategoryId}
                trailing={
                  typeCategories.length > GRID_SIZE ? (
                    <GridTile icon="ellipsis-horizontal" label={t('common.seeAll')} onPress={() => setPicker('category')} />
                  ) : undefined
                }
              />
            </View>
          </View>
        )}

        <View style={[styles.card, styles.cells, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DetailRow icon="calendar-outline" label={t('form.date')} value={dateLabel} onPress={() => setPicker('date')} />
          <DetailRow
            icon="time-outline"
            label={t('form.time')}
            value={time ?? t('form.timeNone')}
            onPress={() => setPicker('time')}
            divider
          />
          {type === 'transfer' ? (
            <>
              <DetailRow
                icon="arrow-up-circle-outline"
                label={t('form.fromWallet')}
                value={walletName(walletId) ?? t('form.selectWallet')}
                onPress={() => setPicker('wallet')}
                divider
              />
              <DetailRow
                icon="arrow-down-circle-outline"
                label={t('form.toWallet')}
                value={walletName(toWalletId) ?? t('form.selectWallet')}
                onPress={() => setPicker('toWallet')}
                divider
              />
            </>
          ) : (
            <DetailRow
              icon="wallet-outline"
              label={t('form.wallet')}
              value={walletName(walletId) ?? t('form.selectWallet')}
              onPress={() => setPicker('wallet')}
              divider
            />
          )}
          <View style={[styles.noteRow, { borderTopColor: colors.border }]}>
            <View style={[styles.cellIcon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name="create-outline" size={18} color={colors.textMuted} />
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('form.notePlaceholder')}
              placeholderTextColor={colors.textFaint}
              maxLength={MAX_NOTE_LENGTH}
              multiline
              style={[styles.noteInput, { color: colors.text }]}
              accessibilityLabel={t('form.note')}
            />
          </View>
        </View>

        {existing && <Button variant="danger" icon="trash-outline" label={t('transactions.delete')} onPress={confirmDelete} />}
      </ScrollView>

      <View style={[styles.pad, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((q) => (
            <Pressable
              key={q}
              onPress={() => setAmount((a) => addAmount(a, q))}
              accessibilityRole="button"
              style={({ pressed }) => [styles.quick, { backgroundColor: pressed ? colors.border : colors.surfaceMuted }]}
            >
              <AppText size={13} weight="500" tone="muted" tabular>
                +{money(q)}
              </AppText>
            </Pressable>
          ))}
        </View>
        <View style={styles.padRow}>
          <View style={styles.digits}>
            {DIGIT_ROWS.map((row) => (
              <View key={row.join()} style={styles.digitRow}>
                {row.map((key) => (
                  <Key key={key} label={key} onPress={() => pressKey(key)} danger={key === 'C'} />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.sideColumn}>
            {/* Fixed one-row height: Key flexes, and the column would otherwise split it 50/50 with Done. */}
            <View style={styles.backspace}>
              <Key icon="backspace-outline" label="⌫" onPress={() => setAmount(removeLastDigit)} />
            </View>
            <Pressable
              onPress={save}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={t('form.done')}
              style={({ pressed }) => [styles.doneKey, { backgroundColor: colors.primary, opacity: pressed || saving ? 0.85 : 1 }]}
            >
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.onPrimary} />
              <AppText tone="onPrimary" size={17} weight="700">
                {t('form.done')}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>

      <CategorySheet
        visible={picker === 'category'}
        type={type === 'income' ? 'income' : 'expense'}
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setPicker(null)}
      />
      <WalletSheet
        visible={picker === 'wallet'}
        title={type === 'transfer' ? t('form.fromWallet') : t('form.wallet')}
        selectedId={walletId}
        balances={balances}
        onSelect={setWalletId}
        onClose={() => setPicker(null)}
      />
      <WalletSheet
        visible={picker === 'toWallet'}
        title={t('form.toWallet')}
        selectedId={toWalletId}
        excludeId={walletId}
        balances={balances}
        onSelect={setToWalletId}
        onClose={() => setPicker(null)}
      />

      {Platform.OS === 'ios' ? (
        <>
          <Sheet visible={picker === 'date'} title={t('form.date')} onClose={() => setPicker(null)}>
            <DateTimePicker value={toPickerDate(date)} mode="date" display="inline" onChange={onPickDate} accentColor={colors.primary} />
            <Button label={t('common.done')} onPress={() => setPicker(null)} />
          </Sheet>
          <Sheet visible={picker === 'time'} title={t('form.time')} onClose={() => setPicker(null)}>
            <DateTimePicker
              value={toPickerDate(date, time ?? formatTime(new Date()))}
              mode="time"
              display="spinner"
              onChange={onPickTime}
              style={styles.spinner}
            />
            <View style={styles.sheetButtons}>
              <View style={styles.flex}>
                <Button
                  variant="secondary"
                  label={t('form.timeClear')}
                  onPress={() => {
                    setTime(undefined);
                    setPicker(null);
                  }}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label={t('common.done')}
                  onPress={() => {
                    if (!time) setTime(formatTime(new Date()));
                    setPicker(null);
                  }}
                />
              </View>
            </View>
          </Sheet>
        </>
      ) : (
        <>
          {picker === 'date' && <DateTimePicker value={toPickerDate(date)} mode="date" onChange={onPickDate} />}
          {picker === 'time' && (
            <DateTimePicker value={toPickerDate(date, time ?? formatTime(new Date()))} mode="time" is24Hour onChange={onPickTime} />
          )}
        </>
      )}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
  divider,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress(): void;
  divider?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.cell,
        divider && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: colors.surfaceTint },
      ]}
    >
      <View style={[styles.cellIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <AppText size={16} style={styles.cellLabel}>
        {label}
      </AppText>
      <AppText size={16} tone="muted" numberOfLines={1} style={styles.cellValue}>
        {value}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

function Key({ label, icon, onPress, danger }: { label: string; icon?: IconName; onPress(): void; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.key,
        { backgroundColor: pressed ? colors.border : danger || icon ? colors.surfaceMuted : colors.background, borderColor: colors.border },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={24} color={colors.text} />
      ) : (
        <AppText size={danger ? 18 : 22} weight={danger ? '600' : '500'} tone={danger ? 'expense' : 'default'}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const KEY_HEIGHT = 52;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  caps: { textTransform: 'uppercase', letterSpacing: 0.6 },
  amountCard: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  amountText: { flexShrink: 1 },
  words: { fontStyle: 'italic', textAlign: 'center' },
  section: { gap: spacing.sm },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.sm },
  cells: { padding: 0, overflow: 'hidden' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  cell: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 14 },
  cellIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cellLabel: { flexShrink: 0 },
  cellValue: { flex: 1, textAlign: 'right' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  noteInput: { flex: 1, fontSize: 16, minHeight: 32, paddingTop: 6 },
  pad: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quick: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  padRow: { flexDirection: 'row', gap: spacing.sm },
  digits: { flex: 3, gap: spacing.sm },
  digitRow: { flexDirection: 'row', gap: spacing.sm },
  sideColumn: { flex: 1, gap: spacing.sm },
  key: {
    flex: 1,
    height: KEY_HEIGHT,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspace: { height: KEY_HEIGHT, flexDirection: 'row' },
  doneKey: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  spinner: { alignSelf: 'center' },
  sheetButtons: { flexDirection: 'row', gap: spacing.sm },
});
