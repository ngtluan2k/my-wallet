import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { TabPage } from '@/components/AppHeader';
import { SigningExpiryInfo } from '@/components/signing';
import { AppText, Button, Card, GroupLabel, ListGroup, ListRow, PageTitle, Screen, Sheet, Toggle } from '@/components/ui';
import { useBackupActions } from '@/components/useBackupActions';
import { useSignOut } from '@/components/useSignOut';
import type { LanguagePreference, ThemePreference } from '@/data/settingsStorage';
import { useT, type TranslationKey } from '@/i18n';
import { useAppLock } from '@/state/appLock';
import { displayName, useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { walletStore } from '@/state/wallet';
import { radius, spacing, useTheme } from '@/theme';

const LANGUAGES: { value: LanguagePreference; label: TranslationKey }[] = [
  { value: 'system', label: 'settings.system' },
  { value: 'vi', label: 'settings.langVietnamese' },
  { value: 'en', label: 'settings.langEnglish' },
];
const THEMES: { value: ThemePreference; label: TranslationKey }[] = [
  { value: 'system', label: 'settings.system' },
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' },
];

export default function SettingsScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const language = useSettings((s) => s.language);
  const theme = useSettings((s) => s.theme);
  const update = useSettings((s) => s.update);
  const user = useAuth((s) => s.user);
  const signOut = useSignOut();
  const { pinSet, biometricEnabled, biometricAvailable } = useAppLock();
  const { exportData, restoreData } = useBackupActions();
  const [picker, setPicker] = useState<'language' | 'theme' | null>(null);

  function resetData() {
    Alert.alert(t('settings.resetData'), t('settings.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => walletStore.getState().resetData().catch(() => Alert.alert(t('common.error'), t('storage.saveFailed'))),
      },
    ]);
  }

  function pinPressed() {
    if (!pinSet) {
      router.push('/pin');
      return;
    }
    Alert.alert(t('settings.pin'), undefined, [
      { text: t('settings.pinChange'), onPress: () => router.push('/pin') },
      {
        text: t('settings.pinRemove'),
        style: 'destructive',
        onPress: () => void useAppLock.getState().removePin(),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  const version = Application.nativeApplicationVersion;
  const faceIdSubtitle = !biometricAvailable
    ? t('settings.faceIdUnavailable')
    : !pinSet
      ? t('settings.faceIdNeedsPin')
      : undefined;

  return (
    <TabPage>
      <Screen>
        <PageTitle eyebrow={t('settings.eyebrow')} title={t('settings.title')} />

        <Card>
          <View style={styles.appCard}>
            <View style={[styles.appIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <AppText size={18} weight="700">
                {t('app.name')}
              </AppText>
              <AppText tone="muted" size={13}>
                {t('settings.appTagline')}
              </AppText>
            </View>
          </View>
        </Card>

        <GroupLabel>{t('settings.section.account')}</GroupLabel>
        <ListGroup>
          <ListRow
            icon="person-circle-outline"
            title={displayName(user) ?? t('settings.profile')}
            subtitle={user?.email}
            chevron
            onPress={() => router.push('/profile')}
          />
          <ListRow icon="log-out-outline" title={t('settings.signOut')} destructive onPress={signOut} />
        </ListGroup>

        <GroupLabel>{t('settings.section.data')}</GroupLabel>
        <ListGroup>
          <ListRow
            icon="download-outline"
            title={t('settings.export')}
            subtitle={t('settings.exportDesc')}
            accessory={<Button compact icon="share-outline" label={t('settings.exportAction')} onPress={exportData} />}
          />
          <ListRow icon="cloud-upload-outline" title={t('settings.import')} subtitle={t('settings.importDesc')} chevron onPress={restoreData} />
          <ListRow icon="trash-outline" title={t('settings.resetData')} subtitle={t('settings.resetDataDesc')} destructive chevron onPress={resetData} />
        </ListGroup>

        <GroupLabel>{t('settings.section.security')}</GroupLabel>
        <ListGroup>
          <ListRow
            icon="keypad-outline"
            title={t('settings.pin')}
            subtitle={pinSet ? t('settings.pinOn') : t('settings.pinOff')}
            value={pinSet ? t('settings.pinChange') : t('settings.pinSetup')}
            chevron
            onPress={pinPressed}
          />
          <ListRow
            icon="scan-outline"
            title={t('settings.faceId')}
            subtitle={faceIdSubtitle}
            accessory={
              <Toggle
                value={biometricEnabled}
                disabled={!pinSet || !biometricAvailable}
                onValueChange={(v) => void useAppLock.getState().setBiometricEnabled(v)}
              />
            }
          />
        </ListGroup>

        <GroupLabel>{t('settings.section.customization')}</GroupLabel>
        <ListGroup>
          <ListRow icon="wallet-outline" title={t('settings.wallets')} chevron onPress={() => router.push('/wallets')} />
          <ListRow icon="pricetags-outline" title={t('settings.categories')} chevron onPress={() => router.push('/categories')} />
          <ListRow icon="cash-outline" title={t('settings.currency')} value={t('settings.currencyValue')} />
          <ListRow
            icon="language-outline"
            title={t('settings.language')}
            value={t(LANGUAGES.find((l) => l.value === language)!.label)}
            chevron
            onPress={() => setPicker('language')}
          />
          <ListRow
            icon="contrast-outline"
            title={t('settings.theme')}
            value={t(THEMES.find((o) => o.value === theme)!.label)}
            chevron
            onPress={() => setPicker('theme')}
          />
        </ListGroup>

        <GroupLabel>{t('settings.section.about')}</GroupLabel>
        <Card>
          <View style={styles.philosophy}>
            <Ionicons name="leaf-outline" size={16} color={colors.primary} />
            <AppText tone="primary" weight="600" size={13}>
              {t('settings.philosophy')}
            </AppText>
          </View>
          <AppText tone="muted" style={styles.italic}>
            “{t('app.slogan')}”
          </AppText>
          <SigningExpiryInfo />
        </Card>
        <ListGroup>
          <ListRow
            icon="document-text-outline"
            title={t('legal.terms.title')}
            chevron
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
          />
          <ListRow
            icon="lock-closed-outline"
            title={t('legal.privacy.title')}
            chevron
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
          />
        </ListGroup>

        <View style={styles.footer}>
          <AppText tone="muted" size={13}>
            {t('settings.footer')}
          </AppText>
          {version && (
            <AppText tone="faint" size={12}>
              {t('settings.version', { version })}
            </AppText>
          )}
        </View>
      </Screen>

      <Sheet visible={picker !== null} title={picker === 'theme' ? t('settings.theme') : t('settings.language')} onClose={() => setPicker(null)}>
        <ListGroup>
          {(picker === 'theme' ? THEMES : LANGUAGES).map((option) => {
            const selected = picker === 'theme' ? option.value === theme : option.value === language;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (picker === 'theme') update({ theme: option.value as ThemePreference });
                  else update({ language: option.value as LanguagePreference });
                  setPicker(null);
                }}
                style={styles.option}
              >
                <AppText size={16} style={styles.flex}>
                  {t(option.label)}
                </AppText>
                {selected && <Ionicons name="checkmark" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </ListGroup>
      </Sheet>
    </TabPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  appCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  philosophy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  italic: { fontStyle: 'italic' },
  footer: { alignItems: 'center', gap: 4, paddingVertical: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 16 },
});
