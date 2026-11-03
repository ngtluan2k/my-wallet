import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, ListGroup, ListRow, SegmentedControl, TextField, Toggle } from '@/components/ui';
import { groupDigits, parseAmountInput } from '@/domain/money';
import type { WalletKind } from '@/domain/types';
import { WALLET_COLORS, walletInUse, type WalletError } from '@/domain/wallets';
import { useT } from '@/i18n';
import { useDebts, useTransactions, useWallet, walletStore } from '@/state/wallet';
import { ValidationError } from '@/state/walletStore';
import { spacing, useTheme } from '@/theme';

export default function WalletEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useWallet((s) => (id ? s.data?.wallets.find((w) => w.id === id) : undefined));
  const transactions = useTransactions();
  const debts = useDebts();
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<WalletKind>(existing?.kind ?? 'bank');
  const [color, setColor] = useState(existing?.color ?? WALLET_COLORS[1]);
  const [balanceText, setBalanceText] = useState(existing ? groupDigits(existing.openingBalance) : '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [errors, setErrors] = useState<WalletError[]>([]);

  const inUse = existing ? walletInUse(transactions, debts, existing.id) : false;

  async function save() {
    const openingBalance = balanceText.trim() === '' ? 0 : (parseAmountInput(balanceText) ?? -1);
    const input = { name, kind, color, openingBalance, isDefault };
    try {
      if (existing) await walletStore.getState().editWallet(existing.id, input);
      else await walletStore.getState().addWallet(input);
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.errors as WalletError[]);
      else Alert.alert(t('common.error'), t('storage.saveFailed'));
    }
  }

  function remove() {
    if (!existing) return;
    const archive = inUse;
    Alert.alert(archive ? t('wallets.archive') : t('common.delete'), archive ? t('wallets.archiveConfirm') : t('wallets.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: archive ? t('wallets.archive') : t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (archive) await walletStore.getState().archiveWallet(existing.id);
            else await walletStore.getState().deleteWallet(existing.id);
            router.back();
          } catch (error) {
            const code = error instanceof Error ? error.message : '';
            Alert.alert(
              t('common.error'),
              code === 'last_wallet' || code === 'wallet_in_use' ? t(`wallets.error.${code}`) : t('storage.saveFailed'),
            );
          }
        },
      },
    ]);
  }

  const errorText = (codes: WalletError[]) => {
    const found = errors.find((e) => codes.includes(e));
    return found ? t(`wallets.error.${found}`) : undefined;
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="muted">
            {t('common.cancel')}
          </AppText>
        </Pressable>
        <AppText size={18} weight="600">
          {existing ? t('wallets.edit') : t('wallets.add')}
        </AppText>
        <Pressable onPress={save} hitSlop={12} accessibilityRole="button">
          <AppText size={17} tone="primary" weight="600">
            {t('common.save')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]} keyboardShouldPersistTaps="handled">
        <TextField
          label={t('wallets.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('wallets.namePlaceholder')}
          maxLength={40}
          error={errorText(['name_required', 'name_too_long', 'name_taken'])}
        />

        <View style={styles.field}>
          <AppText weight="600" size={14}>
            {t('wallets.kind')}
          </AppText>
          <SegmentedControl<WalletKind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'cash', label: t('wallets.kind.cash') },
              { value: 'bank', label: t('wallets.kind.bank') },
              { value: 'ewallet', label: t('wallets.kind.ewallet') },
            ]}
          />
        </View>

        <View style={styles.field}>
          <AppText weight="600" size={14}>
            {t('wallets.color')}
          </AppText>
          <View style={styles.colors}>
            {WALLET_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityRole="radio"
                accessibilityState={{ selected: c === color }}
                accessibilityLabel={c}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? colors.text : 'transparent' }]}
              >
                {c === color && <Ionicons name="checkmark" size={18} color={colors.onHero} />}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <TextField
            label={t('wallets.openingBalance')}
            value={balanceText}
            onChangeText={(v) => {
              const parsed = parseAmountInput(v);
              setBalanceText(parsed !== null ? groupDigits(parsed) : v.replace(/[^\d]/g, ''));
            }}
            keyboardType="number-pad"
            placeholder="0"
            right={<AppText tone="muted">₫</AppText>}
            error={errorText(['balance_invalid'])}
          />
          <AppText tone="muted" size={13}>
            {t('wallets.openingBalanceHint')}
          </AppText>
        </View>

        <ListGroup>
          <ListRow
            icon="star-outline"
            title={t('wallets.setDefault')}
            accessory={<Toggle value={isDefault} onValueChange={setIsDefault} disabled={existing?.isDefault} />}
          />
        </ListGroup>

        {existing?.archived && (
          <Button
            icon="arrow-undo-outline"
            label={t('wallets.unarchive')}
            onPress={() =>
              walletStore
                .getState()
                .unarchiveWallet(existing.id)
                .then(() => router.back())
                .catch(() => Alert.alert(t('common.error'), t('storage.saveFailed')))
            }
          />
        )}

        {existing && !existing.archived && (
          <Button
            variant="danger"
            icon={inUse ? 'archive-outline' : 'trash-outline'}
            label={inUse ? t('wallets.archive') : t('common.delete')}
            onPress={remove}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.lg },
  field: { gap: spacing.sm },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
