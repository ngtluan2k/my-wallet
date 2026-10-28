import { StyleSheet } from 'react-native';

import { SigningExpiryInfo } from '@/components/signing';
import { AppText, Button, Card, Screen, Segmented, SectionTitle } from '@/components/ui';
import { useBackupActions } from '@/components/useBackupActions';
import type { LanguagePreference, ThemePreference } from '@/data/settingsStorage';
import { useT } from '@/i18n';
import { useSettings } from '@/state/settings';
import { spacing } from '@/theme';

export default function SettingsScreen() {
  const { t } = useT();
  const language = useSettings((s) => s.language);
  const theme = useSettings((s) => s.theme);
  const update = useSettings((s) => s.update);
  const { exportData, restoreData } = useBackupActions();

  return (
    <Screen>
      <Card>
        <SectionTitle>{t('settings.language')}</SectionTitle>
        <Segmented<LanguagePreference>
          value={language}
          onChange={(value) => update({ language: value })}
          options={[
            { value: 'system', label: t('settings.system') },
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'en', label: 'English' },
          ]}
        />
      </Card>

      <Card>
        <SectionTitle>{t('settings.theme')}</SectionTitle>
        <Segmented<ThemePreference>
          value={theme}
          onChange={(value) => update({ theme: value })}
          options={[
            { value: 'system', label: t('settings.system') },
            { value: 'light', label: t('settings.light') },
            { value: 'dark', label: t('settings.dark') },
          ]}
        />
      </Card>

      <Card>
        <SectionTitle>{t('settings.data')}</SectionTitle>
        <AppText tone="muted" size={14}>
          {t('settings.dataNote')}
        </AppText>
        <SigningExpiryInfo />
        <Button label={t('settings.export')} icon="share-outline" onPress={exportData} />
        <Button label={t('settings.import')} icon="cloud-download-outline" variant="secondary" onPress={restoreData} />
      </Card>

      <AppText tone="muted" size={13} style={styles.footer}>
        {t('app.name')} — {t('app.slogan')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: spacing.sm },
});
