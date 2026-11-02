import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthLayout, FormNotice, PasswordField } from '@/components/AuthLayout';
import { AppText, Button, TextField } from '@/components/ui';
import { hasErrors, normalizeEmail, signUpErrors } from '@/domain/authForm';
import { useT } from '@/i18n';
import { useAuth, type AuthErrorCode } from '@/state/auth';
import { radius, spacing, useTheme } from '@/theme';

export default function RegisterScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof signUpErrors> | null>(null);
  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found = signUpErrors({ fullName, email, password, confirm, acceptedTerms });
    setErrors(found);
    setFailure(null);
    if (hasErrors(found)) return;
    const address = normalizeEmail(email);
    setBusy(true);
    const result = await useAuth.getState().signUp(address, password, fullName.trim());
    setBusy(false);
    if (result === 'confirm') setConfirmSentTo(address);
    else setFailure(result);
    // null: signed in immediately; the root layout switches to the app.
  }

  const err = (key: keyof ReturnType<typeof signUpErrors>) => {
    const code = errors?.[key];
    return code ? t(`auth.error.${code}`) : undefined;
  };

  return (
    <AuthLayout
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      back
      footer={
        <View style={styles.row}>
          <AppText tone="muted">{t('register.haveAccount')}</AppText>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="link">
            <AppText tone="primary" weight="600">
              {t('register.login')}
            </AppText>
          </Pressable>
        </View>
      }
    >
      {failure && <FormNotice tone="danger" message={t(`auth.error.${failure}`)} />}
      {confirmSentTo && <FormNotice tone="primary" message={t('register.confirmEmail', { email: confirmSentTo })} />}
      <TextField
        label={t('register.fullName')}
        icon="person-outline"
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('register.fullNamePlaceholder')}
        autoComplete="name"
        textContentType="name"
        error={err('fullName')}
      />
      <TextField
        label={t('register.email')}
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder={t('login.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        error={err('email')}
      />
      <PasswordField
        label={t('register.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('register.passwordPlaceholder')}
        autoComplete="new-password"
        textContentType="newPassword"
        error={err('password')}
      />
      <PasswordField
        label={t('register.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t('register.confirmPlaceholder')}
        autoComplete="new-password"
        textContentType="newPassword"
        error={err('confirm')}
      />
      <Pressable
        onPress={() => setAcceptedTerms((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
        style={styles.terms}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: errors?.terms ? colors.danger : colors.primary, backgroundColor: acceptedTerms ? colors.primary : 'transparent' },
          ]}
        >
          {acceptedTerms && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
        </View>
        <AppText size={14} tone={errors?.terms ? 'danger' : 'muted'} style={styles.flex}>
          {t('register.terms')}
        </AppText>
      </Pressable>
      <Button label={t('register.signUp')} onPress={submit} loading={busy} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  terms: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  checkbox: { width: 24, height: 24, borderRadius: radius.sm / 1.5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
