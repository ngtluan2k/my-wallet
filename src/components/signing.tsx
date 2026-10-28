import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { formatLocalDate, formatTime, toLocalDate } from '@/domain/dates';
import { RESIGN_WARNING_DAYS } from '@/domain/provisioning';
import { useT } from '@/i18n';
import { spacing, useTheme } from '@/theme';

import { AppText, Button, Card } from './ui';
import { useBackupActions } from './useBackupActions';
import { useSigningExpiry } from './useSigningExpiry';

/**
 * Dashboard notice for sideloaded builds: always shows days left, and becomes a prominent
 * warning with a backup button in the last days before the build stops launching.
 */
export function SigningExpiryBanner() {
  const signing = useSigningExpiry();
  const { t, language } = useT();
  const { colors } = useTheme();
  const { exportData } = useBackupActions();
  if (!signing) return null;

  const params = {
    days: signing.daysLeft,
    time: formatTime(signing.expiry),
    date: formatLocalDate(toLocalDate(signing.expiry), language),
  };
  if (signing.daysLeft > RESIGN_WARNING_DAYS) {
    return (
      <View style={styles.compact}>
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        <AppText tone="muted" size={13} style={styles.compactText}>
          {t('signing.daysLeftShort', params)}
        </AppText>
      </View>
    );
  }
  return (
    <Card style={{ borderColor: colors.warning, borderWidth: 1 }}>
      <AppText weight="700" tone="warning">
        {t('signing.title')}
      </AppText>
      <AppText>{t(signing.daysLeft <= 0 ? 'signing.today' : 'signing.daysLeft', params)}</AppText>
      <Button label={t('settings.export')} icon="share-outline" onPress={exportData} />
    </Card>
  );
}

/** One-line expiry info for Settings; renders nothing for builds without a profile. */
export function SigningExpiryInfo() {
  const signing = useSigningExpiry();
  const { t, language } = useT();
  if (!signing) return null;
  return (
    <AppText tone={signing.daysLeft <= RESIGN_WARNING_DAYS ? 'warning' : 'muted'} size={14}>
      {t('signing.settingsLabel', {
        days: Math.max(signing.daysLeft, 0),
        time: formatTime(signing.expiry),
        date: formatLocalDate(toLocalDate(signing.expiry), language),
      })}
    </AppText>
  );
}

const styles = StyleSheet.create({
  compact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  compactText: { flex: 1 },
});
