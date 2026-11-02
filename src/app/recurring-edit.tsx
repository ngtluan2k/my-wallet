import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Chip, ListGroup, ListRow, SegmentedControl, Sheet, TextField, Toggle } from '@/components/ui';
import { useCategories } from '@/components/wallet';
import { formatLocalDate, toLocalDate, toPickerDate, today } from '@/domain/dates';
import { groupDigits, parseAmountInput } from '@/domain/money';
import type { RecurringInput } from '@/domain/recurring';
import { MAX_NOTE_LENGTH, type TransactionError } from '@/domain/transactions';
import type { CategoryType, RecurringFrequency } from '@/domain/types';
import { activeWallets, defaultWalletId } from '@/domain/wallets';
import { useT } from '@/i18n';
import { useWallet, useWallets, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { spacing, useTheme } from '@/theme';

/** Add (no params) or edit (`?id=`) a recurring transaction. */
export default function RecurringEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useWallet((s) => (id ? s.data?.recurring.find((r) => r.id === id) : undefined));
  const { t, language, categoryName } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const wallets = useWallets();

  const [type, setType] = useState<CategoryType>(existing?.type ?? 'expense');
  const [amountText, setAmountText] = useState(existing ? groupDigits(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId);
  const [walletId, setWalletId] = useState(existing?.walletId ?? defaultWalletId(wallets) ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(existing?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(existing?.startDate ?? today());
  const [dateOpen, setDateOpen] = useState(false);

  const typeCategories = useMemo(() => [...categories.values()].filter((c) => c.type === type), [categories, type]);
  const walletChoices = activeWallets(wallets).concat(wallets.filter((w) => w.archived && w.id === walletId));

  function changeType(next: CategoryType) {
    setType(next);
    if (categories.get(categoryId ?? '')?.type !== next) setCategoryId(undefined);
  }

  async function save() {
    const input: RecurringInput = {
      type,
      amount: parseAmountInput(amountText) ?? 0,
      walletId,
      categoryId: categoryId ?? '',
      note,
      frequency,
      startDate,
    };
    try {
      if (existing) await walletStore.getState().editRecurring(existing.id, input, today());
      else await walletStore.getState().addRecurring(input, today());
      router.back();
    } catch (error) {
      const message =
        error instanceof ValidationError ? t(`form.error.${(error.errors as TransactionError[])[0]}`) : t('storage.saveFailed');
      Alert.alert(t('common.error'), message);
    }
  }

  function remove() {
    if (!existing) return;
    Alert.alert(t('recurring.delete'), t('recurring.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          walletStore
            .getState()
            .deleteRecurring(existing.id)
            .then(() => router.back())
            .catch(() => Alert.alert(t('common.error'), t('storage.saveFailed'))),
      },
    ]);
  }

  function onPickDate(event: DateTimePickerEvent, value?: Date) {
    if (Platform.OS === 'android') setDateOpen(false);
    if (event.type !== 'dismissed' && value) setStartDate(toLocalDate(value));
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="muted">
            {t('common.cancel')}
          </AppText>
        </Pressable>
        <AppText size={18} weight="600">
          {existing ? t('recurring.edit') : t('recurring.add')}
        </AppText>
        <Pressable onPress={save} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="primary" weight="600">
            {t('common.save')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]} keyboardShouldPersistTaps="handled">
        <SegmentedControl<CategoryType>
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: t('type.expense'), color: colors.expense },
            { value: 'income', label: t('type.income'), color: colors.income },
          ]}
        />

        <TextField
          label={t('form.amount')}
          value={amountText}
          onChangeText={(v) => {
            const parsed = parseAmountInput(v);
            setAmountText(parsed !== null ? groupDigits(parsed) : v.replace(/[^\d]/g, ''));
          }}
          keyboardType="number-pad"
          placeholder="0"
          right={<AppText tone="muted">₫</AppText>}
        />

        <View style={styles.field}>
          <AppText weight="600" size={14}>
            {t('form.category')}
          </AppText>
          <View style={styles.chips}>
            {typeCategories.map((c) => (
              <Chip key={c.id} label={categoryName(c)} color={c.color} selected={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText weight="600" size={14}>
            {t('form.wallet')}
          </AppText>
          <View style={styles.chips}>
            {walletChoices.map((w) => (
              <Chip key={w.id} label={w.name} color={w.color} selected={w.id === walletId} onPress={() => setWalletId(w.id)} />
            ))}
          </View>
        </View>

        <TextField
          label={t('form.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('recurring.notePlaceholder')}
          maxLength={MAX_NOTE_LENGTH}
        />

        <View style={styles.field}>
          <AppText weight="600" size={14}>
            {t('recurring.frequency')}
          </AppText>
          <SegmentedControl<RecurringFrequency>
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: 'weekly', label: t('recurring.weekly') },
              { value: 'monthly', label: t('recurring.monthly') },
            ]}
          />
        </View>

        <ListGroup>
          <ListRow
            icon="calendar-outline"
            title={t('recurring.startDate')}
            value={formatLocalDate(startDate, language)}
            chevron
            onPress={() => setDateOpen(true)}
          />
          {existing && (
            <ListRow
              icon="pause-circle-outline"
              title={t('recurring.paused')}
              subtitle={t('recurring.pausedDesc')}
              accessory={
                <Toggle
                  value={!!existing.paused}
                  onValueChange={(v) =>
                    void walletStore
                      .getState()
                      .setRecurringPaused(existing.id, v, today())
                      .catch(() => Alert.alert(t('common.error'), t('storage.saveFailed')))
                  }
                />
              }
            />
          )}
        </ListGroup>
        <AppText tone="muted" size={13}>
          {t('recurring.startHint')}
        </AppText>

        {existing && <Button variant="danger" icon="trash-outline" label={t('recurring.delete')} onPress={remove} />}
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <Sheet visible={dateOpen} title={t('recurring.startDate')} onClose={() => setDateOpen(false)}>
          <DateTimePicker value={toPickerDate(startDate)} mode="date" display="inline" onChange={onPickDate} accentColor={colors.primary} />
          <Button label={t('common.done')} onPress={() => setDateOpen(false)} />
        </Sheet>
      ) : (
        dateOpen && <DateTimePicker value={toPickerDate(startDate)} mode="date" onChange={onPickDate} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.lg },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
