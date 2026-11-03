import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Chip, ListGroup, ListRow, SegmentedControl, Sheet, TextField } from '@/components/ui';
import { MAX_PERSON_LENGTH, type DebtError, type DebtInput } from '@/domain/debts';
import { formatLocalDate, toLocalDate, toPickerDate, today } from '@/domain/dates';
import { groupDigits, parseAmountInput } from '@/domain/money';
import { MAX_NOTE_LENGTH } from '@/domain/transactions';
import type { DebtDirection, Wallet } from '@/domain/types';
import { activeWallets, defaultWalletId } from '@/domain/wallets';
import { useT } from '@/i18n';
import { useWallet, useWallets, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { spacing, useTheme } from '@/theme';

/** Add (`?direction=lent|borrowed`) or edit (`?id=`) a debt, and mark it paid or unpaid. */
export default function DebtEditScreen() {
  const params = useLocalSearchParams<{ id?: string; direction?: string }>();
  const existing = useWallet((s) => (params.id ? s.data?.debts.find((d) => d.id === params.id) : undefined));
  const { t, language } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wallets = useWallets();

  const [direction, setDirection] = useState<DebtDirection>(
    existing?.direction ?? (params.direction === 'borrowed' ? 'borrowed' : 'lent'),
  );
  const [person, setPerson] = useState(existing?.person ?? '');
  const [amountText, setAmountText] = useState(existing ? groupDigits(existing.amount) : '');
  const [walletId, setWalletId] = useState(existing?.walletId ?? defaultWalletId(wallets) ?? '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [note, setNote] = useState(existing?.note ?? '');
  const [dateOpen, setDateOpen] = useState(false);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settleDate, setSettleDate] = useState(today());
  const [settleWalletId, setSettleWalletId] = useState(existing?.walletId ?? '');
  const [settleDateOpen, setSettleDateOpen] = useState(false);

  const settled = existing?.settledDate !== undefined;
  const walletChoices = withCurrent(wallets, walletId);
  const settleChoices = withCurrent(wallets, settleWalletId);

  function showError(error: unknown) {
    const message = error instanceof ValidationError ? t(`debt.error.${(error.errors as DebtError[])[0]}`) : t('storage.saveFailed');
    Alert.alert(t('common.error'), message);
  }

  async function save() {
    const input: DebtInput = { direction, person, amount: parseAmountInput(amountText) ?? 0, walletId, date, note };
    try {
      if (existing) await walletStore.getState().editDebt(existing.id, input);
      else await walletStore.getState().addDebt(input);
      router.back();
    } catch (error) {
      showError(error);
    }
  }

  function openSettle() {
    if (!existing) return;
    const todayDate = today();
    setSettleDate(todayDate < existing.date ? existing.date : todayDate);
    setSettleWalletId(activeWallets(wallets).some((w) => w.id === existing.walletId) ? existing.walletId : (defaultWalletId(wallets) ?? ''));
    setSettleOpen(true);
  }

  async function confirmSettle() {
    if (!existing) return;
    try {
      await walletStore.getState().settleDebt(existing.id, settleDate, settleWalletId);
      setSettleOpen(false);
    } catch (error) {
      showError(error);
    }
  }

  function reopen() {
    if (!existing) return;
    walletStore.getState().reopenDebt(existing.id).catch(showError);
  }

  function remove() {
    if (!existing) return;
    Alert.alert(t('debt.delete'), t('debt.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          walletStore
            .getState()
            .deleteDebt(existing.id)
            .then(() => router.back())
            .catch(showError),
      },
    ]);
  }

  function onPickDate(event: DateTimePickerEvent, value?: Date) {
    if (Platform.OS === 'android') setDateOpen(false);
    if (event.type !== 'dismissed' && value) setDate(toLocalDate(value));
  }

  function onPickSettleDate(event: DateTimePickerEvent, value?: Date) {
    if (Platform.OS === 'android') setSettleDateOpen(false);
    if (event.type !== 'dismissed' && value) setSettleDate(toLocalDate(value));
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
          {existing ? t('debt.edit') : t('debt.add')}
        </AppText>
        <Pressable onPress={save} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="primary" weight="600">
            {t('common.save')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]} keyboardShouldPersistTaps="handled">
        <SegmentedControl<DebtDirection>
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'lent', label: t('debt.direction.lent'), color: colors.income },
            { value: 'borrowed', label: t('debt.direction.borrowed'), color: colors.expense },
          ]}
        />

        <TextField
          label={t('debt.person')}
          value={person}
          onChangeText={setPerson}
          placeholder={t('debt.personPlaceholder')}
          maxLength={MAX_PERSON_LENGTH}
        />

        <TextField
          label={t('debt.amount')}
          value={amountText}
          onChangeText={(v) => {
            const parsed = parseAmountInput(v);
            setAmountText(parsed !== null ? groupDigits(parsed) : v.replace(/[^\d]/g, ''));
          }}
          keyboardType="number-pad"
          placeholder="0"
          right={<AppText tone="muted">₫</AppText>}
        />

        <WalletChips
          label={direction === 'lent' ? t('debt.walletLent') : t('debt.walletBorrowed')}
          wallets={walletChoices}
          value={walletId}
          onChange={setWalletId}
        />

        <TextField
          label={t('form.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('debt.notePlaceholder')}
          maxLength={MAX_NOTE_LENGTH}
        />

        <ListGroup>
          <ListRow
            icon="calendar-outline"
            title={t('debt.date')}
            value={formatLocalDate(date, language)}
            chevron
            onPress={() => setDateOpen(true)}
          />
          {existing && settled && (
            <ListRow
              icon="checkmark-circle-outline"
              title={t('debt.settledOn', { date: formatLocalDate(existing.settledDate!, language) })}
              value={wallets.find((w) => w.id === existing.settleWalletId)?.name}
            />
          )}
        </ListGroup>

        {existing &&
          (settled ? (
            <Button variant="secondary" icon="refresh-outline" label={t('debt.reopen')} onPress={reopen} />
          ) : (
            <Button icon="checkmark-done-outline" label={t('debt.settle')} onPress={openSettle} />
          ))}
        {existing && <Button variant="danger" icon="trash-outline" label={t('debt.delete')} onPress={remove} />}
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <Sheet visible={dateOpen} title={t('debt.date')} onClose={() => setDateOpen(false)}>
          <DateTimePicker value={toPickerDate(date)} mode="date" display="inline" onChange={onPickDate} accentColor={colors.primary} />
          <Button label={t('common.done')} onPress={() => setDateOpen(false)} />
        </Sheet>
      ) : (
        dateOpen && <DateTimePicker value={toPickerDate(date)} mode="date" onChange={onPickDate} />
      )}

      <Sheet visible={settleOpen} title={t('debt.settle')} onClose={() => setSettleOpen(false)}>
        <View style={styles.settleBody}>
          <View style={styles.dateRow}>
            <AppText weight="600" size={14}>
              {t('debt.settleDate')}
            </AppText>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={toPickerDate(settleDate)}
                mode="date"
                display="compact"
                onChange={onPickSettleDate}
                accentColor={colors.primary}
              />
            ) : (
              <Pressable onPress={() => setSettleDateOpen(true)} hitSlop={8} accessibilityRole="button">
                <AppText tone="primary" weight="600">
                  {formatLocalDate(settleDate, language)}
                </AppText>
              </Pressable>
            )}
          </View>
          <WalletChips
            label={existing?.direction === 'borrowed' ? t('debt.settleWalletBorrowed') : t('debt.settleWalletLent')}
            wallets={settleChoices}
            value={settleWalletId}
            onChange={setSettleWalletId}
          />
          <Button label={t('debt.settleConfirm')} onPress={confirmSettle} />
        </View>
        {Platform.OS !== 'ios' && settleDateOpen && (
          <DateTimePicker value={toPickerDate(settleDate)} mode="date" onChange={onPickSettleDate} />
        )}
      </Sheet>
    </View>
  );
}

/** Active wallets, plus the selected one if it has since been archived (editing old data). */
function withCurrent(wallets: Wallet[], selectedId: string): Wallet[] {
  return activeWallets(wallets).concat(wallets.filter((w) => w.archived && w.id === selectedId));
}

function WalletChips({
  label,
  wallets,
  value,
  onChange,
}: {
  label: string;
  wallets: Wallet[];
  value: string;
  onChange(id: string): void;
}) {
  return (
    <View style={styles.field}>
      <AppText weight="600" size={14}>
        {label}
      </AppText>
      <View style={styles.chips}>
        {wallets.map((w) => (
          <Chip key={w.id} label={w.name} color={w.color} selected={w.id === value} onPress={() => onChange(w.id)} />
        ))}
      </View>
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
  settleBody: { gap: spacing.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
