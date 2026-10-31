import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { useT } from '@/i18n';
import { spacing, useTheme } from '@/theme';

export default function SettingsScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const { theme, language: langPref, update } = useSettings();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  return (
    <Screen>
      <Card>
        <AppText weight="600" size={16}>{t('settings.language')}</AppText>
        <View style={styles.row}>
          {(['system', 'vi', 'en'] as const).map((l) => (
            <Pressable
              key={l}
              onPress={() => update({ language: l })}
              style={[styles.chip, langPref === l && { backgroundColor: colors.primary }]}
            >
              <AppText tone={langPref === l ? 'default' : 'muted'} size={14}>
                {l === 'system' ? t('settings.system') : l === 'vi' ? 'Tiếng Việt' : 'English'}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <AppText weight="600" size={16}>{t('settings.theme')}</AppText>
        <View style={styles.row}>
          {(['system', 'light', 'dark'] as const).map((th) => (
            <Pressable
              key={th}
              onPress={() => update({ theme: th })}
              style={[styles.chip, theme === th && { backgroundColor: colors.primary }]}
            >
              <AppText tone={theme === th ? 'default' : 'muted'} size={14}>
                {th === 'system' ? t('settings.system') : th === 'light' ? t('settings.light') : t('settings.dark')}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Button label="Sign Out" variant="danger" onPress={handleSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
});