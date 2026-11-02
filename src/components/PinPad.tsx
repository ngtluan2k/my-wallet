import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { PIN_LENGTH } from '@/state/appLock';
import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'extra', '0', 'back'] as const;

/** PIN dots and a 3×4 keypad. Calls onComplete once PIN_LENGTH digits are entered. */
export function PinPad({
  value,
  onChange,
  onComplete,
  extraKey,
}: {
  value: string;
  onChange(value: string): void;
  onComplete(value: string): void;
  /** Optional bottom-left key, e.g. Face ID. */
  extraKey?: { icon: 'scan-outline'; label: string; onPress(): void };
}) {
  const { colors } = useTheme();

  function press(key: (typeof KEYS)[number]) {
    if (key === 'extra') return extraKey?.onPress();
    if (key === 'back') return onChange(value.slice(0, -1));
    if (value.length >= PIN_LENGTH) return;
    const next = value + key;
    onChange(next);
    if (next.length === PIN_LENGTH) onComplete(next);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={`${value.length}/${PIN_LENGTH}`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: colors.primary, backgroundColor: i < value.length ? colors.primary : 'transparent' },
            ]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key) => {
          if (key === 'extra' && !extraKey) return <View key={key} style={styles.key} />;
          return (
            <Pressable
              key={key}
              onPress={() => press(key)}
              accessibilityRole="button"
              accessibilityLabel={key === 'back' ? '⌫' : key === 'extra' ? extraKey?.label : key}
              style={({ pressed }) => [
                styles.key,
                key !== 'extra' && key !== 'back' && { backgroundColor: pressed ? colors.border : colors.surfaceMuted },
              ]}
            >
              {key === 'back' ? (
                <Ionicons name="backspace-outline" size={26} color={colors.text} />
              ) : key === 'extra' ? (
                <Ionicons name={extraKey!.icon} size={28} color={colors.primary} />
              ) : (
                <AppText size={28} weight="500">
                  {key}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  dots: { flexDirection: 'row', gap: spacing.lg },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76 + 2 * spacing.lg, gap: spacing.lg },
  key: { width: 76, height: 76, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
