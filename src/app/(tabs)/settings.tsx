import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, IOSwitch, SectionLabel, SettingsGroup, SettingsRow } from '@/components/ui';
import { useBackupActions } from '@/components/useBackupActions';
import { useSettings } from '@/state/settings';
import { useT } from '@/i18n';
import { spacing, useTheme } from '@/theme';

const CURRENCY_OPTIONS = ['VND', 'USD', 'EUR', 'JPY', 'KRW', 'THB', 'SGD', 'MYR'] as const;
const CURRENCY_SYMBOLS: Record<string, string> = {
  VND: '₫', USD: '$', EUR: '€', JPY: '¥', KRW: '₩', THB: '฿', SGD: 'S$', MYR: 'RM',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const {
    theme,
    language: langPref,
    currency,
    faceIdEnabled,
    pinEnabled,
    update,
  } = useSettings();
  const { exportData, restoreData } = useBackupActions();

  async function handleDeleteAll() {
    Alert.alert(
      t('settings.resetData'),
      t('settings.resetDataDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { walletStore } = await import('@/state/wallet');
            await walletStore.getState().replaceAll({
              version: 1,
              transactions: [],
              categories: [],
              budgets: [],
              wallets: [],
            });
            router.replace('/');
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}15` }]}>
            <AppText tone="primary" size={24}>🛡️</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.heroTitleRow}>
              <AppText weight="700" size={17}>{t('app.name')}</AppText>
              <AppText tone="muted" size={11} style={styles.versionBadge}>
                {t('settings.version')}
              </AppText>
            </View>
            <AppText tone="muted" size={13}>{t('settings.offlineFirst')}</AppText>
          </View>
        </View>
        <View style={[styles.heroDivider, { borderColor: colors.border }]} />
        <View style={styles.heroFooter}>
          <View style={styles.heroStatusRow}>
            <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
            <AppText tone="primary" size={14} weight="600">{t('settings.dataLocal')}</AppText>
          </View>
          <AppText tone="muted" size={12}>{t('settings.secure')}</AppText>
        </View>
      </View>

      {/* Section 1: Data Management */}
      <SectionLabel>{t('settings.section.dataManagement')}</SectionLabel>
      <SettingsGroup>
        {/* Export backup */}
        <View style={styles.exportGroup}>
          <View style={styles.exportContent}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
              <AppText tone="primary" size={18}>⬇️</AppText>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="600" size={17}>{t('settings.backupJson')}</AppText>
              <AppText tone="muted" size={13}>
                {t('settings.backupJsonDesc')}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={exportData}
            style={({ pressed }) => [
              styles.exportButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <AppText tone="white" size={14} weight="600">
              {t('settings.export')}
            </AppText>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={[styles.groupDivider, { borderColor: colors.border }]} />

        {/* Import backup */}
        <SettingsRow
          icon="cloud-upload-outline"
          iconBg={colors.primary}
          title={t('settings.restoreJson')}
          subtitle={t('settings.restoreJsonDesc')}
          onPress={restoreData}
        />

        {/* Divider */}
        <View style={[styles.groupDivider, { borderColor: colors.border }]} />

        {/* Delete all data */}
        <SettingsRow
          icon="trash-outline"
          iconBg={colors.danger}
          title={t('settings.resetData')}
          subtitle={t('settings.resetDataDesc')}
          destructive
          onPress={handleDeleteAll}
        />
      </SettingsGroup>

      {/* Section 2: Security */}
      <SectionLabel>{t('settings.section.security')}</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon="finger-print-outline"
          iconBg={colors.primary}
          title={t('settings.faceId')}
          accessory={
            <IOSwitch
              value={faceIdEnabled}
              onValueChange={(v) => update({ faceIdEnabled: v })}
            />
          }
        />

        <View style={[styles.groupDivider, { borderColor: colors.border }]} />

        <SettingsRow
          icon="key-outline"
          iconBg={colors.tertiary}
          title={t('settings.pin')}
          subtitle={pinEnabled ? t('settings.pinSet') : undefined}
          accessory={
            <Pressable onPress={() => {}} style={styles.changePinText}>
              <AppText tone="muted" size={14}>{t('settings.pinChange')}</AppText>
              <AppText tone="muted" size={16}>›</AppText>
            </Pressable>
          }
        />
      </SettingsGroup>

      {/* Section 3: Customization */}
      <SectionLabel>{t('settings.section.customization')}</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon="cash-outline"
          iconBg={colors.primary}
          title={t('settings.currency')}
          accessory={
            <View style={styles.accessoryRow}>
              <AppText tone="muted" size={14}>
                {currency} ({CURRENCY_SYMBOLS[currency]})
              </AppText>
              <AppText tone="muted" size={16}>›</AppText>
            </View>
          }
          onPress={() => {
            const nextIdx = (CURRENCY_OPTIONS.indexOf(currency) + 1) % CURRENCY_OPTIONS.length;
            update({ currency: CURRENCY_OPTIONS[nextIdx] });
          }}
        />

        <View style={[styles.groupDivider, { borderColor: colors.border }]} />

        <SettingsRow
          icon="language-outline"
          iconBg={colors.primary}
          title={t('settings.language')}
          accessory={
            <View style={styles.accessoryRow}>
              <AppText tone="muted" size={14}>
                {langPref === 'vi' ? 'Tiếng Việt (VN)' : langPref === 'en' ? 'English (US)' : 'Hệ thống'}
              </AppText>
              <AppText tone="muted" size={16}>›</AppText>
            </View>
          }
          onPress={() => {
            const next = langPref === 'vi' ? 'en' : langPref === 'en' ? 'system' : 'vi';
            update({ language: next });
          }}
        />

        <View style={[styles.groupDivider, { borderColor: colors.border }]} />

        <SettingsRow
          icon="contrast-outline"
          iconBg={colors.primary}
          title={t('settings.theme')}
          accessory={
            <View style={styles.accessoryRow}>
              <AppText tone="muted" size={14}>
                {theme === 'system'
                  ? t('settings.system')
                  : theme === 'light'
                    ? t('settings.light')
                    : t('settings.dark')}
              </AppText>
              <AppText tone="muted" size={16}>›</AppText>
            </View>
          }
          onPress={() => {
            const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
            update({ theme: next });
          }}
        />
      </SettingsGroup>

      {/* Section 4: About */}
      <SectionLabel>{t('settings.section.about')}</SectionLabel>
      <SettingsGroup>
        {/* Philosophy box */}
        <View style={[styles.philosophyBox, { backgroundColor: `${colors.surface}cc` }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
            <AppText tone="primary" size={16}>🌿</AppText>
            <AppText tone="primary" weight="600" size={13}>{t('settings.philosophy')}</AppText>
          </View>
          <AppText tone="muted" size={14} style={{ fontStyle: 'italic' }}>
            {'"'}{t('app.slogan')}{'"'}
          </AppText>
        </View>

        <View style={[styles.groupDivider, { borderColor: colors.border }]} />

        <SettingsRow
          icon="information-circle-outline"
          iconBg={colors.tertiary}
          title={t('settings.aboutApp')}
          onPress={() => {}}
        />

        <View style={[styles.groupDivider, { borderColor: colors.border }]} />

        <SettingsRow
          icon="star-outline"
          iconBg={colors.warning}
          title={t('settings.rateApp')}
          accessory={<AppText tone="muted" size={16}>↗</AppText>}
          onPress={() => {}}
        />
      </SettingsGroup>

      {/* Footer */}
      <View style={styles.footer}>
        <AppText tone="muted" size={13}>
          {t('app.name')} © 2025 • Tôn trọng 100% quyền riêng tư
        </AppText>
        <AppText tone="muted" size={11} style={{ marginTop: 4, opacity: 0.7 }}>
          Bản phát hành ổn định cho iOS
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
    paddingBottom: 48,
    gap: spacing.xs,
  },
  heroCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginBottom: 12,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exportGroup: {
    padding: 16,
    gap: 12,
  },
  exportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  accessoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePinText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  philosophyBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
});
