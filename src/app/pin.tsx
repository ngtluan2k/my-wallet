import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPad } from '@/components/PinPad';
import { AppText } from '@/components/ui';
import { useT } from '@/i18n';
import { useAppLock } from '@/state/appLock';
import { spacing, useTheme } from '@/theme';

/** Sets or changes the app lock PIN: enter, then confirm. */
export default function PinSetupScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [first, setFirst] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [mismatch, setMismatch] = useState(false);

  async function complete(pin: string) {
    if (first === null) {
      setFirst(pin);
      setValue('');
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setValue('');
      setMismatch(true);
      return;
    }
    try {
      await useAppLock.getState().setPin(pin);
      router.back();
    } catch {
      Alert.alert(t('common.error'));
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <Ionicons name="close" size={28} color={colors.text} />
      </Pressable>
      <View style={styles.header}>
        <AppText size={22} weight="700">
          {first === null ? t('pin.setTitle') : t('pin.confirmTitle')}
        </AppText>
        <AppText tone={mismatch ? 'danger' : 'muted'}>{mismatch ? t('pin.mismatch') : t('pin.setSubtitle')}</AppText>
      </View>
      <PinPad
        value={value}
        onChange={(v) => {
          setValue(v);
          setMismatch(false);
        }}
        onComplete={complete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', gap: spacing.xl },
  close: { alignSelf: 'flex-start', marginLeft: spacing.md },
  header: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
});
