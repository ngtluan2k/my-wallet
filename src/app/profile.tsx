import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormNotice, PasswordField } from '@/components/AuthLayout';
import { AppText, Button, Card, GroupLabel, Screen, Sheet, TextField } from '@/components/ui';
import { useSignOut } from '@/components/useSignOut';
import {
  displayNameError,
  hasErrors,
  initials,
  MAX_DISPLAY_NAME_LENGTH,
  passwordChangeErrors,
  type AuthFieldError,
  type ProfileFieldError,
} from '@/domain/authForm';
import { useT } from '@/i18n';
import { displayName, useAuth, type AuthErrorCode } from '@/state/auth';
import { deleteAccount } from '@/state/session';
import { spacing, useTheme } from '@/theme';

type Notice = { tone: 'danger' | 'primary'; message: string } | null;

/** Profile: display name, email (read-only), password change and sign out. Needs a connection to save. */
export default function ProfileScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const email = user?.email ?? '';
  const savedName = displayName(user) ?? '';
  const signOut = useSignOut();

  const [name, setName] = useState(savedName);
  const [nameError, setNameError] = useState<ProfileFieldError>();
  const [nameNotice, setNameNotice] = useState<Notice>(null);
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<'current' | 'password' | 'confirm', AuthFieldError>>>({});
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);
  const [deleting, setDeleting] = useState(false);

  const failure = (code: AuthErrorCode): Notice => ({ tone: 'danger', message: t(`auth.error.${code}`) });

  async function saveName() {
    const error = displayNameError(name);
    setNameError(error);
    setNameNotice(null);
    if (error) return;
    setSavingName(true);
    const code = await useAuth.getState().updateDisplayName(name);
    setSavingName(false);
    setNameNotice(code ? failure(code) : { tone: 'primary', message: t('profile.nameSaved') });
  }

  async function savePassword() {
    const errors = passwordChangeErrors({ current, password, confirm });
    setPasswordErrors(errors);
    setPasswordNotice(null);
    if (hasErrors(errors)) return;
    setSavingPassword(true);
    const code = await useAuth.getState().changePassword(current, password);
    setSavingPassword(false);
    if (code) {
      setPasswordNotice(failure(code));
      return;
    }
    setCurrent('');
    setPassword('');
    setConfirm('');
    setPasswordNotice({ tone: 'primary', message: t('profile.passwordChanged') });
  }

  async function confirmDelete() {
    if (!deletePassword) {
      setDeleteNotice({ tone: 'danger', message: t('auth.error.password_required') });
      return;
    }
    setDeleting(true);
    setDeleteNotice(null);
    const code = await deleteAccount(deletePassword);
    // On success the user is signed out and the root layout shows the sign-in screen.
    if (code) {
      setDeleting(false);
      setDeleteNotice(failure(code));
    }
  }

  const fieldError = (code: AuthFieldError | ProfileFieldError | undefined) => (code ? t(`auth.error.${code}`) : undefined);

  return (
    <Screen contentStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
      <Card>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <AppText size={22} weight="700" tone="primary">
              {initials(savedName, email)}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText size={18} weight="700" numberOfLines={1}>
              {savedName || t('profile.noName')}
            </AppText>
            <AppText tone="muted" size={14} numberOfLines={1}>
              {email}
            </AppText>
          </View>
        </View>
      </Card>

      <GroupLabel>{t('profile.section.info')}</GroupLabel>
      <Card style={styles.form}>
        <TextField
          label={t('profile.name')}
          icon="person-outline"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError(undefined);
            setNameNotice(null);
          }}
          placeholder={t('register.fullNamePlaceholder')}
          autoCapitalize="words"
          maxLength={MAX_DISPLAY_NAME_LENGTH + 10}
          error={fieldError(nameError)}
        />
        <TextField label={t('profile.email')} icon="mail-outline" value={email} editable={false} />
        <AppText tone="muted" size={13}>
          {t('profile.emailHint')}
        </AppText>
        {nameNotice && <FormNotice tone={nameNotice.tone} message={nameNotice.message} />}
        <Button
          label={t('profile.saveName')}
          onPress={saveName}
          loading={savingName}
          disabled={name.trim() === savedName}
        />
      </Card>

      <GroupLabel>{t('profile.section.password')}</GroupLabel>
      <Card style={styles.form}>
        <PasswordField
          label={t('profile.currentPassword')}
          value={current}
          onChangeText={setCurrent}
          textContentType="password"
          autoComplete="current-password"
          error={fieldError(passwordErrors.current)}
        />
        <PasswordField
          label={t('profile.newPassword')}
          value={password}
          onChangeText={setPassword}
          textContentType="newPassword"
          autoComplete="new-password"
          error={fieldError(passwordErrors.password)}
        />
        <PasswordField
          label={t('profile.confirmPassword')}
          value={confirm}
          onChangeText={setConfirm}
          textContentType="newPassword"
          autoComplete="new-password"
          error={fieldError(passwordErrors.confirm)}
        />
        {passwordNotice && <FormNotice tone={passwordNotice.tone} message={passwordNotice.message} />}
        <Button
          label={t('profile.changePassword')}
          onPress={savePassword}
          loading={savingPassword}
          disabled={!current && !password && !confirm}
        />
      </Card>

      <Button variant="danger" icon="log-out-outline" label={t('settings.signOut')} onPress={signOut} />

      <GroupLabel>{t('profile.section.danger')}</GroupLabel>
      <Card style={styles.form}>
        <AppText tone="muted" size={14}>
          {t('profile.deleteDesc')}
        </AppText>
        <Button
          variant="danger"
          icon="trash-outline"
          label={t('profile.delete')}
          onPress={() => {
            setDeletePassword('');
            setDeleteNotice(null);
            setDeleteOpen(true);
          }}
        />
      </Card>

      <Sheet visible={deleteOpen} title={t('profile.delete')} onClose={() => !deleting && setDeleteOpen(false)}>
        <AppText>{t('profile.deleteWarning')}</AppText>
        <PasswordField
          label={t('profile.currentPassword')}
          value={deletePassword}
          onChangeText={setDeletePassword}
          textContentType="password"
          autoComplete="current-password"
        />
        {deleteNotice && <FormNotice tone={deleteNotice.tone} message={deleteNotice.message} />}
        <Button variant="danger" icon="trash-outline" label={t('profile.deleteConfirm')} onPress={confirmDelete} loading={deleting} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.md },
});
