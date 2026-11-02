import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthLayout, FormNotice, PasswordField } from '@/components/AuthLayout';
import { AppText, Button, TextField } from '@/components/ui';
import { hasErrors, normalizeEmail, signInErrors, type AuthFieldError } from '@/domain/authForm';
import { useT } from '@/i18n';
import { useAuth, type AuthErrorCode } from '@/state/auth';
import { spacing } from '@/theme';

export default function LoginScreen() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: AuthFieldError; password?: AuthFieldError }>({});
  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found = signInErrors(email, password);
    setErrors(found);
    setFailure(null);
    if (hasErrors(found)) return;
    setBusy(true);
    const error = await useAuth.getState().signIn(normalizeEmail(email), password);
    setBusy(false);
    // On success the root layout switches to the app.
    setFailure(error);
  }

  return (
    <AuthLayout
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <View style={styles.row}>
          <AppText tone="muted">{t('login.noAccount')}</AppText>
          <Link href="/register" asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <AppText tone="primary" weight="600">
                {t('login.signUp')}
              </AppText>
            </Pressable>
          </Link>
        </View>
      }
    >
      {failure && <FormNotice tone="danger" message={t(`auth.error.${failure}`)} />}
      <TextField
        label={t('login.email')}
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder={t('login.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        error={errors.email && t(`auth.error.${errors.email}`)}
      />
      <PasswordField
        label={t('login.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('login.passwordPlaceholder')}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password && t(`auth.error.${errors.password}`)}
      />
      <Pressable
        onPress={() => router.push({ pathname: '/forgot', params: { email } })}
        hitSlop={8}
        accessibilityRole="link"
        style={styles.forgot}
      >
        <AppText tone="primary" weight="600">
          {t('login.forgot')}
        </AppText>
      </Pressable>
      <Button label={t('login.signIn')} icon="arrow-forward" onPress={submit} loading={busy} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  forgot: { alignSelf: 'flex-end' },
});
