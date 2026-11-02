import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { MAX_PIN_ATTEMPTS } from '@/domain/pinLock';
import { useAppLock } from '@/state/appLock';
import { useAuth } from '@/state/auth';
import { radius, spacing, useTheme } from '@/theme';

import { PinPad } from './PinPad';
import { AppText } from './ui';

export function LockScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const biometricEnabled = useAppLock((s) => s.biometricEnabled);
  const failures = useAppLock((s) => s.failures);
  const lockedUntil = useAppLock((s) => s.lockedUntil);
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const waitSeconds = lockedUntil !== null && lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;

  // Ticks the lockout countdown; stops once the wait is over.
  useEffect(() => {
    if (lockedUntil === null || lockedUntil <= Date.now()) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const tryBiometrics = useCallback(() => {
    void useAppLock.getState().unlockWithBiometrics(t('lock.biometricPrompt'));
  }, [t]);

  useEffect(() => {
    if (biometricEnabled) tryBiometrics();
  }, [biometricEnabled, tryBiometrics]);

  async function submit(value: string) {
    const result = await useAppLock.getState().unlockWithPin(value);
    setNow(Date.now());
    if (result === 'ok') return;
    setPin('');
    if (result === 'exhausted') {
      // The lock is already removed; data synced to the account is safe.
      await useAuth.getState().signOut();
      Alert.alert(t('lock.exhaustedTitle'), t('lock.exhausted'));
      return;
    }
    setWrong(result === 'wrong');
  }

  function forgot() {
    Alert.alert(t('lock.forgot'), t('lock.forgotConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          await useAppLock.getState().removePin();
          await useAuth.getState().signOut();
        },
      },
    ]);
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Ionicons name="wallet" size={30} color={colors.onPrimary} />
        </View>
        <AppText size={22} weight="700">
          {t('lock.title')}
        </AppText>
        <AppText tone={wrong || waitSeconds > 0 ? 'danger' : 'muted'} style={styles.center}>
          {waitSeconds > 0
            ? t('lock.wait', { seconds: waitSeconds })
            : wrong
              ? MAX_PIN_ATTEMPTS - failures <= 5
                ? t('lock.wrongRemaining', { count: MAX_PIN_ATTEMPTS - failures })
                : t('lock.wrong')
              : t('lock.subtitle')}
        </AppText>
      </View>
      <PinPad
        value={pin}
        onChange={(v) => {
          setPin(v);
          setWrong(false);
        }}
        onComplete={submit}
        disabled={waitSeconds > 0}
        extraKey={biometricEnabled ? { icon: 'scan-outline', label: t('lock.useBiometric'), onPress: tryBiometrics } : undefined}
      />
      <Pressable onPress={forgot} hitSlop={12} accessibilityRole="button">
        <AppText tone="primary" weight="600">
          {t('lock.forgot')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'space-between' },
  header: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  center: { textAlign: 'center' },
  logo: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
});
