import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatTime, toLocalDate } from '@/domain/dates';
import { RESIGN_WARNING_DAYS } from '@/domain/provisioning';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { AppText, Button, Card } from './ui';
import { useBackupActions } from './useBackupActions';
import { useSigningExpiry } from './useSigningExpiry';

/**
 * Dashboard notice for sideloaded builds: collapsible icon that expands on press.
 * Shows a prominent warning with a backup button in the last days before the build stops launching.
 */
export function SigningExpiryBanner() {
  const signing = useSigningExpiry();
  const { t, language } = useT();
  const { colors } = useTheme();
  const { exportData } = useBackupActions();
  const [expanded, setExpanded] = useState(false);
  if (!signing) return null;

  const params = {
    days: signing.daysLeft,
    time: formatTime(signing.expiry),
    date: formatLocalDate(toLocalDate(signing.expiry), language),
  };

  const isUrgent = signing.daysLeft <= RESIGN_WARNING_DAYS;

  // Collapsed state: small icon only
  if (!expanded) {
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        style={[styles.collapsed, { backgroundColor: isUrgent ? colors.danger + '15' : colors.surfaceMuted }]}
        accessibilityRole="button"
        accessibilityLabel={t('signing.daysLeftShort', params)}
      >
        <Ionicons
          name={isUrgent ? 'warning' : 'time-outline'}
          size={18}
          color={isUrgent ? colors.danger : colors.textMuted}
        />
        {isUrgent && (
          <AppText weight="700" tone="danger" size={12} style={styles.badge}>
            {signing.daysLeft}
          </AppText>
        )}
      </Pressable>
    );
  }

  // Expanded state: full details
  return (
    <Card style={{ borderColor: isUrgent ? colors.danger : colors.warning, borderWidth: 1 }}>
      <View style={styles.expandedHeader}>
        <AppText weight="700" tone={isUrgent ? 'danger' : 'warning'} size={16}>
          {isUrgent ? t('signing.title') : t('signing.daysLeftShort', params)}
        </AppText>
        <Pressable onPress={() => setExpanded(false)} hitSlop={8} accessibilityRole="button">
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      {!isUrgent && (
        <AppText tone="muted" size={13} style={styles.detail}>
          {t('signing.hint', params)}
        </AppText>
      )}
      {isUrgent && (
        <>
          <AppText>{t(signing.daysLeft <= 0 ? 'signing.today' : 'signing.daysLeft', params)}</AppText>
          <Button label={t('settings.export')} icon="share-outline" onPress={exportData} />
        </>
      )}
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
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  badge: {
    marginLeft: 4,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detail: {
    marginBottom: 8,
  },
});
