import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useCategories } from '@/components/wallet';
import { AppText } from '@/components/ui';

import { formatLocalDate, today } from '@/domain/dates';
import { parseAmountInput } from '@/domain/money';
import { validateTransactionInput, MAX_NOTE_LENGTH } from '@/domain/transactions';

import type { TransactionType } from '@/domain/types';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useWallet, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { radius, spacing, useTheme } from '@/theme';

const NUMPAD_BUTTONS = [
  ['1', '2', '3', 'backspace'],
  ['4', '5', '6', 'C'],
  ['7', '8', '9', 'done'],
  ['000', '0', '.', 'done'],
];

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useWallet((s) => (id ? s.data?.transactions.find((t) => t.id === id) : undefined));
  const { t, language, categoryName } = useT();
  const { colors } = useTheme();
  const categories = useCategories();

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [rawAmount, setRawAmount] = useState(existing ? String(existing.amount) : '0');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [date, setDate] = useState(existing?.transactionDate ?? today());
  const [note, setNote] = useState(existing?.note ?? '');
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const typeCategories = useMemo(() => [...categories.values()].filter((c) => c.type === type), [categories, type]);
  const displayAmount = useMemo(() => {
    const num = parseInt(rawAmount, 10);
    return isNaN(num) ? '0' : num.toLocaleString('vi-VN');
  }, [rawAmount]);

  function changeType(next: TransactionType) {
    setType(next);
    if (categories.get(categoryId)?.type !== next) {
      setCategoryId('');
    }
  }

  function pressNumpad(value: string) {
    if (value === 'backspace') {
      if (rawAmount.length > 1) {
        setRawAmount(rawAmount.slice(0, -1));
      } else {
        setRawAmount('0');
      }
    } else if (value === 'C') {
      setRawAmount('0');
    } else if (value === 'done') {
      save();
    } else {
      if (rawAmount === '0' && value !== '.') {
        setRawAmount(value);
      } else if (rawAmount.length < 12) {
        setRawAmount(rawAmount + value);
      }
    }
  }

  function showDatePicker() {
    setDatePickerVisible(true);
  }

  function hideDatePicker() {
    setDatePickerVisible(false);
  }

  function handleDateChange(_event: unknown, selectedDate: Date | undefined) {
    hideDatePicker();
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  }

  async function save() {
    const input = { type, amount: parseAmountInput(rawAmount) ?? 0, categoryId, transactionDate: date, note };
    const found = validateTransactionInput(input, [...categories.values()]);
    if (found.length) {
      Alert.alert(t('common.error'), t(`form.error.${found[0]}`));
      return;
    }

    try {
      if (existing) await walletStore.getState().editTransaction(existing.id, input);
      else await walletStore.getState().addTransaction(input);
      useSelectedMonth.getState().setMonth(date.slice(0, 7));
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) Alert.alert(t('common.error'), t('storage.saveFailed'));
      else Alert.alert(t('common.error'), t('storage.saveFailed'));
    }
  }



  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <AppText size={18} tone="muted">{t('common.cancel')}</AppText>
          </Pressable>
          <AppText weight="600" size={20}>{t(existing ? 'transactions.edit' : 'transactions.add')}</AppText>
          <Pressable onPress={save} style={styles.headerBtn}>
            <AppText size={18} tone="primary" weight="600">{t('common.save')}</AppText>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Segmented Control */}
          <View style={styles.segmentedContainer}>
            <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                style={[styles.segmentedBtn, type === 'expense' && { backgroundColor: colors.surfaceContainer, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }]}
                onPress={() => changeType('expense')}
              >
                <View style={[styles.segmentedDot, { backgroundColor: type === 'expense' ? colors.expense : 'transparent' }]} />
                <AppText size={14} weight={type === 'expense' ? '600' : '400'} tone={type === 'expense' ? 'expense' : 'muted'}>
                  {t('type.expense')}
                </AppText>
              </Pressable>
              <Pressable
                style={[styles.segmentedBtn, type === 'income' && { backgroundColor: colors.surfaceContainer, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }]}
                onPress={() => changeType('income')}
              >
                <View style={[styles.segmentedDot, { backgroundColor: type === 'income' ? colors.income : 'transparent' }]} />
                <AppText size={14} weight={type === 'income' ? '600' : '400'} tone={type === 'income' ? 'income' : 'muted'}>
                  {t('type.income')}
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Amount Display */}
          <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText size={12} tone="muted" weight="600" style={styles.amountLabel}>
              {t('form.amount').toUpperCase()}
            </AppText>
            <View style={styles.amountRow}>
              <AppText size={32} weight="700" tone={type === 'expense' ? 'expense' : type === 'income' ? 'income' : 'default'}>
                {type === 'expense' ? '−' : type === 'income' ? '+' : ''}
              </AppText>
              <AppText size={32} weight="700">
                {displayAmount}
              </AppText>
              <AppText size={20} weight="600" tone="muted">₫</AppText>
              <View style={[styles.cursor, { backgroundColor: colors.primary }]} />
            </View>
            <AppText size={13} tone="muted" style={styles.amountHint}>
              {numberToWords(parseInt(rawAmount, 10) || 0, language)}
            </AppText>
          </View>

          {/* Category Grid */}
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <AppText size={13} tone="muted" weight="600">
                {t('form.category').toUpperCase()}
              </AppText>
              <Pressable onPress={() => router.push('/(tabs)/settings' as any)}>
                <AppText size={12} tone="primary" weight="600">
                  {t('common.all')}
                </AppText>
              </Pressable>
            </View>
            <View style={[styles.categoryGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {typeCategories.slice(0, 8).map((c) => {
                const isSelected = c.id === categoryId;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.categoryItem,
                      isSelected && { backgroundColor: c.color + '10', borderColor: c.color, borderWidth: 2 },
                      !isSelected && { borderColor: 'transparent', borderWidth: 2 },
                    ]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: c.color + '10' }]}>
                      <Ionicons name={c.icon as any} size={22} color={c.color} />
                    </View>
                    <AppText size={12} weight={isSelected ? '600' : '400'} tone={isSelected ? 'default' : 'muted'} numberOfLines={1}>
                      {categoryName(c)}
                    </AppText>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
              <Pressable style={[styles.categoryItem, { borderColor: 'transparent' }]}>
                <View style={[styles.categoryIcon, { backgroundColor: colors.surfaceMuted }]}>
                  <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
                </View>
                <AppText size={12} tone="muted" numberOfLines={1}>Khác</AppText>
              </Pressable>
            </View>
          </View>

          {/* Detail Cells */}
          <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Date */}
            <Pressable onPress={showDatePicker} style={[styles.detailCell, { borderBottomColor: colors.border }]}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIcon, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </View>
                <AppText size={15}>{t('form.date')}</AppText>
              </View>
              <View style={styles.detailRight}>
                <AppText size={15} tone="muted">{formatLocalDate(date, language)}</AppText>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Pressable>

            {/* Note */}
            <View style={[styles.detailCell, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIcon, { backgroundColor: colors.textMuted + '10' }]}>
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </View>
                <AppText size={15}>{t('form.note')}</AppText>
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('form.notePlaceholder')}
                placeholderTextColor={colors.textMuted}
                  maxLength={MAX_NOTE_LENGTH}
                multiline
                style={[styles.noteInput, { color: colors.text }]}
              />
            </View>

            {/* Wallet */}
            <Pressable style={[styles.detailCell]}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIcon, { backgroundColor: colors.secondary + '10' }]}>
                  <Ionicons name="wallet-outline" size={18} color={colors.secondary} />
                </View>
                <AppText size={15}>{t('transaction.wallet.primary')}</AppText>
              </View>
              <View style={styles.detailRight}>
                <AppText size={15} tone="muted">{t('transaction.wallet.primary')}</AppText>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>
        </ScrollView>

        {/* Numpad */}
        <View style={[styles.numpadContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {/* Quick shortcuts */}
          <View style={styles.quickShortcuts}>
            <Pressable style={[styles.shortcutBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => pressNumpad('50000')}>
              <AppText size={13} tone="muted">+50.000₫</AppText>
            </Pressable>
            <Pressable style={[styles.shortcutBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => pressNumpad('100000')}>
              <AppText size={13} tone="muted">+100.000₫</AppText>
            </Pressable>
            <Pressable style={[styles.shortcutBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => pressNumpad('500000')}>
              <AppText size={13} tone="muted">+500.000₫</AppText>
            </Pressable>
          </View>

          {/* Numpad grid */}
          <View style={styles.numpadGrid}>
            {NUMPAD_BUTTONS.flat().map((btn, i) => {
              const isBackspace = btn === 'backspace';
              const isClear = btn === 'C';
              const isDone = btn === 'done';
              const row = Math.floor(i / 4);
              const col = i % 4;
              const isSpansTwoRows = row === 2 && col === 3;

              if (isDone && isSpansTwoRows) return null;
              if (btn === 'done' && row === 2) return null;

              return (
                <Pressable
                  key={`${row}-${col}-${btn}`}
                  style={[
                    styles.numpadBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    (isBackspace || isClear) && { backgroundColor: colors.surfaceMuted },
                  ]}
                  onPress={() => pressNumpad(btn)}
                >
                  {isBackspace ? (
                    <Ionicons name="backspace-outline" size={22} color={colors.text} />
                  ) : isClear ? (
                    <AppText size={16} weight="600" tone="expense">C</AppText>
                  ) : (
                    <AppText size={20} weight="500">{btn}</AppText>
                  )}
                </Pressable>
              );
            })}
            {/* Spanning done button */}
            <Pressable
              style={[styles.numpadDoneBtnSpan, { backgroundColor: colors.primary }]}
              onPress={() => pressNumpad('done')}
            >
              <View style={styles.doneContent}>
                <Ionicons name="checkmark-circle" size={26} color={colors.onPrimary} />
                <AppText size={14} weight="600" tone="white">{t('common.save')}</AppText>
              </View>
            </Pressable>
          </View>
        </View>

        {datePickerVisible && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            minimumDate={new Date('2000-01-01')}
            maximumDate={new Date()}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// Simple number to words for Vietnamese
function numberToWords(num: number, language: string): string {
  if (language === 'en') {
    return num.toLocaleString('en-US') + ' dong';
  }
  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const hundreds = ['', 'một trăm', 'hai trăm', 'ba trăm', 'bốn trăm', 'năm trăm', 'sáu trăm', 'bảy trăm', 'tám trăm', 'chín trăm'];
  const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  if (num === 0) return 'Không đồng';

  let result = '';
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const h = Math.floor(chunk / 100);
      const t = Math.floor((chunk % 100) / 10);
      const o = chunk % 10;
      let chunkStr = '';
      if (h > 0) chunkStr += hundreds[h] + ' ';
      if (t > 0) chunkStr += tens[t] + ' ';
      if (o > 0) chunkStr += ones[o] + ' ';
      result = chunkStr.trim() + (units[unitIndex] ? ' ' + units[unitIndex] : '') + (result ? ' ' + result : '');
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  return result + ' đồng';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  segmentedContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  segmentedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  amountCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amountLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    minHeight: 40,
  },
  cursor: {
    width: 2,
    height: 28,
    borderRadius: 1,
  },
  amountHint: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    position: 'relative',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#006948',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSection: {
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  detailCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    width: '100%',
    marginTop: spacing.sm,
    fontSize: 15,
    minHeight: 40,
  },
  numpadContainer: {
    borderTopWidth: 1,
    padding: spacing.md,
    paddingBottom: spacing.lg + (Platform.OS === 'ios' ? 20 : 0),
  },
  quickShortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  shortcutBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  numpadBtn: {
    width: '23.5%',
    aspectRatio: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadDoneBtnSpan: {
    width: '23.5%',
    height: '100%',
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm + 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneContent: {
    alignItems: 'center',
    gap: 2,
  },
});
