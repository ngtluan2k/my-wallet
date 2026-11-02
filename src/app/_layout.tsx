import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockScreen } from '@/components/LockScreen';
import { AppText, Button } from '@/components/ui';
import { useBackupActions } from '@/components/useBackupActions';
import { StorageError } from '@/data/WalletRepository';
import { useT } from '@/i18n';
import { useAppLock, watchAppLock } from '@/state/appLock';
import { useAuth } from '@/state/auth';
import { startSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { useWallet, walletStore } from '@/state/wallet';
import { spacing, useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();
  const { t } = useT();
  const settingsLoaded = useSettings((s) => s.loaded);
  const lockLoaded = useAppLock((s) => s.loaded);
  const locked = useAppLock((s) => s.locked);
  const user = useAuth((s) => s.user);
  const walletStatus = useWallet((s) => s.status);

  useEffect(() => {
    useSettings.getState().load();
    useAppLock.getState().load();
    watchAppLock();
    startSession();
    useAuth.getState().load();
  }, []);

  const { colors } = theme;
  const signedIn = !!user;
  const booting = !settingsLoaded || !lockLoaded || user === undefined;

  let overlay = null;
  if (booting || (signedIn && (walletStatus === 'idle' || walletStatus === 'loading'))) {
    overlay = (
      <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (signedIn && locked) {
    overlay = <LockScreen />;
  } else if (signedIn && walletStatus === 'error') {
    overlay = <LoadErrorScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="transaction" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="report" options={{ title: t('report.title') }} />
          <Stack.Screen name="wallets" options={{ title: t('wallets.title') }} />
          <Stack.Screen name="profile" options={{ title: t('profile.title') }} />
          <Stack.Screen name="wallet-edit" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="pin" options={{ presentation: 'modal', headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {overlay}
    </SafeAreaProvider>
  );
}

/** Shown when the user's data file can't be read. Restoring a backup is the way out. */
function LoadErrorScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const { restoreData } = useBackupActions();
  const error = useWallet((s) => s.loadError);
  const code = error instanceof StorageError && error.code !== 'write_failed' ? error.code : 'read_failed';

  return (
    <View style={[StyleSheet.absoluteFill, styles.center, styles.error, { backgroundColor: colors.background }]}>
      <AppText size={20} weight="700" style={styles.errorText}>
        {t('storage.error.title')}
      </AppText>
      <AppText tone="muted" style={styles.errorText}>
        {t(`storage.error.${code}`)}
      </AppText>
      <Button label={t('storage.restore')} icon="download-outline" onPress={restoreData} />
      <Button label={t('common.retry')} variant="secondary" onPress={() => walletStore.getState().load()} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { padding: spacing.xl, gap: spacing.md, alignItems: 'stretch' },
  errorText: { textAlign: 'center' },
});
