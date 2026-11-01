import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useCategories } from '@/components/wallet';
import { AppText, Button, Chip, Screen, Segmented, SectionTitle } from '@/components/ui';
import { formatLocalDate, today } from '@/domain/dates';
import { groupDigits, parseAmountInput } from '@/domain/money';
import { MAX_NOTE_LENGTH, validateTransactionInput, type TransactionError } from '@/domain/transactions';
import type { TransactionType } from '@/domain/types';
import { useT } from '@/i18n';
import { useSelectedMonth } from '@/state/ui';
import { useWallet, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { radius, spacing, useTheme } from '@/theme';

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useWallet((s) => (id ? s.data?.transactions.find((t) => t.id === id) : undefined));
  const { t, language, categoryName } = useT();
  const { colors } = useTheme();
  const categories = useCategories();

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amountText, setAmountText] = useState(existing ? groupDigits(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [date, setDate] = useState(existing?.transactionDate ?? today());
  const [note, setNote] = useState(existing?.note ?? '');
  const [errors, setErrors] = useState<TransactionError[]>([]);
  const [saving, setSaving] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const typeCategories = useMemo(() => [...categories.values()].filter((c) => c.type === type), [categories, type]);

  function changeType(next: TransactionType) {
    setType(next);
    if (categories.get(categoryId)?.type !== next) setCategoryId('');
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
    const input = { type, amount: parseAmountInput(amountText) ?? 0, categoryId, transactionDate: date, note };
    const found = validateTransactionInput(input, [...categories.values()]);
    setErrors(found);
    if (found.length) return;

    setSaving(true);
    try {
      if (existing) await walletStore.getState().editTransaction(existing.id, input);
      else await walletStore.getState().addTransaction(input);
      // Show the month the transaction landed in.
      useSelectedMonth.getState().setMonth(date.slice(0, 7));
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.errors);
      else Alert.alert(t('common.error'), t('storage.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert(t('transactions.deleteConfirm'), undefined, [
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

  const inputStyle = [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }];
  const errorText = (field: TransactionError[]) => {
    const error = errors.find((e) => field.includes(e));
    return error ? (
      <AppText tone="danger" size={13}>
        {t(`form.error.${error}`)}
      </AppText>
    ) : null;
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t(existing ? 'transactions.edit' : 'transactions.add') }} />
      <Screen>
        <Segmented<TransactionType>
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: t('type.expense') },
            { value: 'income', label: t('type.income') },
          ]}
        />

        <View style={styles.field}>
          <SectionTitle>{t('form.amount')}</SectionTitle>
          <TextInput
            value={amountText}
            onChangeText={(value) => {
              const parsed = parseAmountInput(value);
              setAmountText(parsed !== null ? groupDigits(parsed) : value.replace(/[^\d]/g, ''));
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            autoFocus={!existing}
            style={[inputStyle, styles.amount, { color: type === 'income' ? colors.income : colors.expense }]}
          />
          {errorText(['amount_invalid'])}
        </View>

        <View style={styles.field}>
          <SectionTitle>{t('form.category')}</SectionTitle>
          <View style={styles.chips}>
            {typeCategories.map((c) => (
              <Chip
                key={c.id}
                label={categoryName(c)}
                color={c.color}
                selected={c.id === categoryId}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
          </View>
          {errorText(['category_invalid', 'category_type_mismatch'])}
        </View>

        <View style={styles.field}>
          <SectionTitle>{t('form.date')}</SectionTitle>
          <Pressable onPress={showDatePicker} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('form.selectDate')}>
            <View style={[styles.dateRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={22} color={colors.text} />
              <AppText size={16} weight="500" style={styles.dateText}>
                {formatLocalDate(date, language)}
              </AppText>
              <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
            </View>
          </Pressable>
          {date !== today() && (
            <View style={styles.chips}>
              <Chip label={t('form.today')} selected={false} onPress={() => setDate(today())} />
            </View>
          )}
          {errorText(['date_invalid'])}
        </View>

        <View style={styles.field}>
          <SectionTitle>{t('form.note')}</SectionTitle>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('form.notePlaceholder')}
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_NOTE_LENGTH}
            multiline
            style={[inputStyle, styles.note]}
          />
          {errorText(['note_too_long'])}
        </View>

        <Button label={t('common.save')} onPress={save} disabled={saving} />
        {existing && <Button label={t('common.delete')} variant="danger" icon="trash-outline" onPress={confirmDelete} />}

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
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: spacing.sm },
  input: { 
    borderWidth: 1, 
    borderRadius: radius.md, 
    paddingHorizontal: spacing.md, 
    paddingVertical: 12, 
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  amount: { 
    fontSize: 28, 
    fontWeight: '700',
    color: '#059669', // match primary color
  },
  note: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  dateText: { flex: 1, textAlign: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});