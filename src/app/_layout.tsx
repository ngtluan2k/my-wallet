import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { StorageError } from '@/data/WalletRepository';
import { useT } from '@/i18n';
import { useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { useWallet, walletStore } from '@/state/wallet';
import { spacing, useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();
  const { t } = useT();
  const settingsLoaded = useSettings((s) => s.loaded);
  const status = useWallet((s) => s.status);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    useSettings.getState().load();
    useAuth.getState().load();
  }, []);

  useEffect(() => {
    if (user) {
      walletStore.getState().load();
    }
  }, [user]);

  const { colors } = theme;
  
  let content;
  if (!settingsLoaded || authLoading) {
    content = (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (!user) {
    content = (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="register" options={{ title: 'Đăng ký' }} />
      </Stack>
    );
  } else {
    content = (
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transaction" options={{ presentation: 'modal', title: t('transactions.add') }} />
      </Stack>
    );
  }

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {content}
    </>
  );
}

function LoadErrorScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const error = useWallet((s) => s.loadError);
  const code = error instanceof StorageError && error.code !== 'write_failed' ? error.code : 'read_failed';

  return (
    <View style={[styles.center, styles.error, { backgroundColor: colors.background }]}>
      <AppText size={20} weight="700">
        {t('storage.error.title')}
      </AppText>
      <AppText tone="muted" style={styles.errorText}>
        {t(`storage.error.${code}`)}
      </AppText>
      <Button label={t('common.retry')} variant="secondary" onPress={() => walletStore.getState().load()} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { padding: spacing.xl, gap: spacing.lg, alignItems: 'stretch' },
  errorText: { textAlign: 'center' },
});