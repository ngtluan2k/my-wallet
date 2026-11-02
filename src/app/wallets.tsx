import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, GroupLabel, HeroCard, IconCircle, ListGroup, Screen } from '@/components/ui';
import type { Wallet } from '@/domain/types';
import { totalBalance, walletBalances } from '@/domain/wallets';
import { useT } from '@/i18n';
import { useTransactions, useWallets } from '@/state/wallet';
import { spacing, useTheme } from '@/theme';

export default function WalletsScreen() {
  const { t, money } = useT();
  const { colors } = useTheme();
  const wallets = useWallets();
  const transactions = useTransactions();
  const balances = useMemo(() => walletBalances(wallets, transactions), [wallets, transactions]);
  const total = useMemo(() => totalBalance(wallets, transactions), [wallets, transactions]);
  const active = wallets.filter((w) => !w.archived);
  const archived = wallets.filter((w) => w.archived);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/wallet-edit')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('wallets.add')}
            >
              <Ionicons name="add" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        <HeroCard>
          <AppText tone="onHeroMuted" size={14} weight="500">
            {t('wallets.total')}
          </AppText>
          <AppText tone="onHero" size={32} weight="700" tabular adjustsFontSizeToFit numberOfLines={1}>
            {money(total)}
          </AppText>
        </HeroCard>

        <ListGroup>
          {active.map((w) => (
            <WalletRow key={w.id} wallet={w} balance={balances.get(w.id) ?? 0} />
          ))}
        </ListGroup>

        <Button variant="secondary" icon="add" label={t('wallets.add')} onPress={() => router.push('/wallet-edit')} />

        {archived.length > 0 && (
          <>
            <GroupLabel>{t('wallets.archivedSection')}</GroupLabel>
            <ListGroup>
              {archived.map((w) => (
                <WalletRow key={w.id} wallet={w} balance={balances.get(w.id) ?? 0} />
              ))}
            </ListGroup>
          </>
        )}
      </Screen>
    </>
  );
}

function WalletRow({ wallet, balance }: { wallet: Wallet; balance: number }) {
  const { t, money } = useT();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/wallet-edit', params: { id: wallet.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTint }, wallet.archived && styles.archived]}
    >
      <IconCircle icon={wallet.icon} color={wallet.color} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <AppText weight="600" size={16} numberOfLines={1} style={styles.shrink}>
            {wallet.name}
          </AppText>
          {wallet.isDefault && <Badge label={t('wallets.default')} color={colors.primary} background={colors.primarySoft} />}
        </View>
        <AppText tone="muted" size={13}>
          {t(`wallets.kind.${wallet.kind}`)}
        </AppText>
      </View>
      <AppText weight="600" tabular tone={balance < 0 ? 'expense' : 'default'}>
        {money(balance)}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  archived: { opacity: 0.6 },
});
