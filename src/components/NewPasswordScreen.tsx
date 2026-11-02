import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { hasErrors, MIN_PASSWORD_LENGTH, type AuthFieldError } from '@/domain/authForm';
import { useT } from '@/i18n';
import { useAuth, type AuthErrorCode } from '@/state/auth';
import { useTheme } from '@/theme';

import { AuthLayout, FormNotice, PasswordField } from './AuthLayout';
import { AppText, Button } from './ui';

/**
 * Shown over the app after opening a password-reset link. The link already signed the user in;
 * this asks for the new password before anything else.
 */
export function NewPasswordScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: AuthFieldError; confirm?: AuthFieldError }>({});
  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found = {
      password: !password
        ? ('password_required' as const)
        : password.length < MIN_PASSWORD_LENGTH
          ? ('password_too_short' as const)
          : undefined,
      confirm: confirm !== password ? ('confirm_mismatch' as const) : undefined,
    };
    setErrors(found);
    setFailure(null);
    if (hasErrors(found)) return;
    setBusy(true);
    const code = await useAuth.getState().setNewPassword(password);
    setBusy(false);
    setFailure(code);
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
      <AuthLayout title={t('newPassword.title')} subtitle={t('newPassword.subtitle')}>
        {failure && <FormNotice tone="danger" message={t(`auth.error.${failure}`)} />}
        <PasswordField
          label={t('profile.newPassword')}
          value={password}
          onChangeText={setPassword}
          textContentType="newPassword"
          autoComplete="new-password"
          error={errors.password && t(`auth.error.${errors.password}`)}
        />
        <PasswordField
          label={t('profile.confirmPassword')}
          value={confirm}
          onChangeText={setConfirm}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={submit}
          error={errors.confirm && t(`auth.error.${errors.confirm}`)}
        />
        <Button label={t('newPassword.save')} onPress={submit} loading={busy} />
        <AppText tone="muted" size={13} style={styles.center} onPress={() => useAuth.setState({ recovering: false })}>
          {t('newPassword.skip')}
        </AppText>
      </AuthLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
