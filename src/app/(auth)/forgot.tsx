import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AuthLayout, FormNotice } from '@/components/AuthLayout';
import { Button, TextField } from '@/components/ui';
import { emailError, normalizeEmail, type AuthFieldError } from '@/domain/authForm';
import { useT } from '@/i18n';
import { useAuth, type AuthErrorCode } from '@/state/auth';

export default function ForgotPasswordScreen() {
  const { t } = useT();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<AuthFieldError | undefined>();
  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found = emailError(email);
    setError(found);
    setFailure(null);
    if (found) return;
    const address = normalizeEmail(email);
    setBusy(true);
    const result = await useAuth.getState().resetPassword(address);
    setBusy(false);
    if (result) setFailure(result);
    else setSentTo(address);
  }

  return (
    <AuthLayout title={t('forgot.title')} subtitle={t('forgot.subtitle')} back>
      {failure && <FormNotice tone="danger" message={t(`auth.error.${failure}`)} />}
      {sentTo && <FormNotice tone="primary" message={t('forgot.sent', { email: sentTo })} />}
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
        returnKeyType="send"
        onSubmitEditing={submit}
        error={error && t(`auth.error.${error}`)}
      />
      <Button label={t('forgot.send')} icon="paper-plane-outline" onPress={submit} loading={busy} />
    </AuthLayout>
  );
}
