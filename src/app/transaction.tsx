import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn, Pop, PressScale } from '@/components/motion';
import { AppText, Button, SegmentedControl, Sheet, type IconName } from '@/components/ui';
import { CategoryGrid, CategorySheet, GridTile, useCategories, WalletSheet } from '@/components/wallet';
import { formatLocalDate, formatTime, toLocalDate, toPickerDate, today } from '@/domain/dates';
import { addAmount, appendDigits, removeLastDigit } from '@/domain/money';
import { vietnameseAmountWords } from '@/domain/numberWords';
import { MAX_PERSON_LENGTH, type DebtError } from '@/domain/debts';
import { MAX_NOTE_LENGTH, type TransactionError } from '@/domain/transactions';
import type { DebtDirection, TransactionType } from '@/domain/types';
import { defaultWalletId, walletBalances } from '@/domain/wallets';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useDebts, useTransactions, useWallet, useWallets, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { fontFamily, radius, spacing, useTheme } from '@/theme';

const GRID_SIZE = 7;
const QUICK_AMOUNTS = [50_000, 100_000, 500_000];
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '000'],
] as const;

type Picker = 'category' | 'wallet' | 'toWallet' | 'date' | 'time' | null;

/**
 * What the screen records: an income/expense transaction, or a debt (saved to the debt book).
 * Transfers can't be created any more; an old transfer can still be edited or deleted.
 */
type Mode = TransactionType | 'debt';

export default function TransactionScreen() {
  const { id, mode: modeParam, direction: directionParam } = useLocalSearchParams<{ id?: string; mode?: string; direction?: string }>();
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

  const [type, setType] = useState<Mode>(existing?.type ?? (modeParam === 'debt' ? 'debt' : 'expense'));
  const [direction, setDirection] = useState<DebtDirection>(directionParam === 'borrowed' ? 'borrowed' : 'lent');
  const [person, setPerson] = useState('');
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
  const accent = { income: colors.income, expense: colors.expense, debt: colors.debt, transfer: colors.transfer }[type];
  const accentSoft = { income: colors.incomeSoft, expense: colors.expenseSoft, debt: colors.debtSoft, transfer: colors.transferSoft }[type];
  const isFlow = type === 'income' || type === 'expense';

  const modes: { value: Mode; label: string; color: string }[] = [
    { value: 'expense', label: t('type.expense'), color: colors.expense },
    { value: 'income', label: t('type.income'), color: colors.income },
  ];
  // A saved transaction can't become a debt, and new transfers can't be created.
  if (!existing) modes.push({ value: 'debt', label: t('type.debt'), color: colors.debt });
  if (existing?.type === 'transfer') modes.push({ value: 'transfer', label: t('type.transfer'), color: colors.transfer });

  function changeType(next: Mode) {
    setType(next);
    if ((next === 'income' || next === 'expense') && categoriesMap.get(categoryId ?? '')?.type !== next) setCategoryId(undefined);
  }

  function pressKey(key: string) {
    if (key === 'C') setAmount(0);
    else setAmount((a) => appendDigits(a, key));
  }

  async function saveDebt() {
    setSaving(true);
    try {
      await walletStore.getState().addDebt({ direction, person, amount, walletId, date, note });
      router.back();
    } catch (error) {
      const message = error instanceof ValidationError ? t(`debt.error.${(error.errors as DebtError[])[0]}`) : t('storage.saveFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (saving) return;
    if (type === 'debt') return saveDebt();
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
        <SegmentedControl<Mode> value={type} onChange={changeType} options={modes} />

        <View style={[styles.amountCard, { backgroundColor: accentSoft, borderColor: accent }]}>
          <AppText size={12} weight="600" style={[styles.caps, { color: accent }]}>
            {type === 'debt' ? t(direction === 'lent' ? 'debt.direction.lent' : 'debt.direction.borrowed') : t('form.amount')}
          </AppText>
          <Pop trigger={amount} style={styles.amountRow}>
            {isFlow && (
              <AppText size={32} weight="700" style={{ color: accent }}>
                {type === 'expense' ? '−' : '+'}
              </AppText>
            )}
            <AppText
              size={40}
              weight="700"
              tabular
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.amountText, { color: accent }]}
            >
              {money(amount)}
            </AppText>
          </Pop>
          {language === 'vi' && amount > 0 && (
            <AppText tone="muted" size={13} style={styles.words}>
              {vietnameseAmountWords(amount)}
            </AppText>
          )}
        </View>

        {type === 'debt' && (
          <FadeIn key="debt" style={styles.section}>
            <View style={styles.directionRow}>
              <DirectionCard
                icon="arrow-up-circle-outline"
                title={t('debt.direction.lent')}
                hint={t('form.debtLentHint')}
                selected={direction === 'lent'}
                onPress={() => setDirection('lent')}
              />
              <DirectionCard
                icon="arrow-down-circle-outline"
                title={t('debt.direction.borrowed')}
                hint={t('form.debtBorrowedHint')}
                selected={direction === 'borrowed'}
                onPress={() => setDirection('borrowed')}
              />
            </View>
            <View style={[styles.card, styles.personRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.cellIcon, { backgroundColor: colors.debtSoft }]}>
                <Ionicons name="person-outline" size={18} color={colors.debt} />
              </View>
              <TextInput
                value={person}
                onChangeText={setPerson}
                placeholder={t(direction === 'lent' ? 'form.personLent' : 'form.personBorrowed')}
                placeholderTextColor={colors.textFaint}
                maxLength={MAX_PERSON_LENGTH}
                style={[styles.personInput, { color: colors.text }]}
                accessibilityLabel={t('debt.person')}
              />
            </View>
            <AppText tone="muted" size={13}>
              {t('form.debtNotCounted')}
            </AppText>
          </FadeIn>
        )}

        {isFlow && (
          <FadeIn key={type} style={styles.section}>
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
          </FadeIn>
        )}

        <View style={[styles.card, styles.cells, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DetailRow icon="calendar-outline" label={t('form.date')} value={dateLabel} onPress={() => setPicker('date')} />
          {type !== 'debt' && (
            <DetailRow
              icon="time-outline"
              label={t('form.time')}
              value={time ?? t('form.timeNone')}
              onPress={() => setPicker('time')}
              divider
            />
          )}
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
              label={type === 'debt' ? t(direction === 'lent' ? 'debt.walletLent' : 'debt.walletBorrowed') : t('form.wallet')}
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
              placeholder={type === 'debt' ? t('debt.notePlaceholder') : t('form.notePlaceholder')}
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
            <PressScale
              onPress={save}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={t('form.done')}
              scaleTo={0.95}
              style={[styles.doneKey, { backgroundColor: accent, opacity: saving ? 0.85 : 1 }]}
            >
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.onPrimary} />
              <AppText tone="onPrimary" size={17} weight="700">
                {t('form.done')}
              </AppText>
            </PressScale>
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
        title={
          type === 'transfer'
            ? t('form.fromWallet')
            : type === 'debt'
              ? t(direction === 'lent' ? 'debt.walletLent' : 'debt.walletBorrowed')
              : t('form.wallet')
        }
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

function DirectionCard({
  icon,
  title,
  hint,
  selected,
  onPress,
}: {
  icon: IconName;
  title: string;
  hint: string;
  selected: boolean;
  onPress(): void;
}) {
  const { colors } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      scaleTo={0.96}
      style={[
        styles.direction,
        {
          backgroundColor: selected ? colors.debtSoft : colors.surface,
          borderColor: selected ? colors.debt : colors.border,
        },
      ]}
    >
      <View style={styles.directionHead}>
        <Ionicons name={icon} size={20} color={selected ? colors.debt : colors.textMuted} />
        <AppText weight="700" size={15} style={selected ? { color: colors.debt } : undefined}>
          {title}
        </AppText>
      </View>
      <AppText tone="muted" size={12}>
        {hint}
      </AppText>
    </PressScale>
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
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.92}
      style={[styles.key, { backgroundColor: danger || icon ? colors.surfaceMuted : colors.background, borderColor: colors.border }]}
    >
      {icon ? (
        <Ionicons name={icon} size={24} color={colors.text} />
      ) : (
        <AppText size={danger ? 18 : 22} weight={danger ? '600' : '500'} tone={danger ? 'expense' : 'default'}>
          {label}
        </AppText>
      )}
    </PressScale>
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
  directionRow: { flexDirection: 'row', gap: spacing.sm },
  direction: { flex: 1, borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, gap: spacing.xs },
  directionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  personInput: { flex: 1, fontFamily, fontSize: 16, paddingVertical: 8 },
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
  noteInput: { flex: 1, fontFamily, fontSize: 16, minHeight: 32, paddingTop: 6 },
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
