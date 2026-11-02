import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import { spacing } from '@/theme';

/** Number of numbered sections per document (`legal.<doc>.<n>.title` / `.body`). */
const SECTIONS = { terms: 6, privacy: 7 } as const;
type Doc = keyof typeof SECTIONS;

/** Terms of service and privacy policy. Reachable signed in or out (linked from sign-up). */
export default function LegalScreen() {
  const { t } = useT();
  const params = useLocalSearchParams<{ doc?: string }>();
  const doc: Doc = params.doc === 'privacy' ? 'privacy' : 'terms';
  const sections = Array.from({ length: SECTIONS[doc] }, (_, i) => i + 1);

  return (
    <>
      <Stack.Screen options={{ title: t(`legal.${doc}.title`) }} />
      <Screen>
        <AppText tone="muted" size={13}>
          {t('legal.updated')}
        </AppText>
        <AppText>{t(`legal.${doc}.intro`)}</AppText>
        {sections.map((n) => (
          <Card key={n}>
            <View style={styles.section}>
              <AppText weight="600" size={16}>
                {t(`legal.${doc}.${n}.title` as TranslationKey)}
              </AppText>
              <AppText tone="muted" style={styles.body}>
                {t(`legal.${doc}.${n}.body` as TranslationKey)}
              </AppText>
            </View>
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  body: { lineHeight: 22 },
});
