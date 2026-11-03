import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fontFamily, useTheme } from '@/theme';

/**
 * The Ví Mình mark, drawn with Views on a 120-unit grid (same geometry as the app icon and the
 * brand book): a tilted card in the wallet (the tilt echoes the acute accent of "Ví"), the wallet
 * body, its clasp tab and the coin.
 */
export function BrandMark({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const k = size / 120;
  return (
    <View style={[{ width: size, height: size }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      <View
        style={{
          position: 'absolute',
          left: 22 * k,
          top: 16 * k,
          width: 66 * k,
          height: 42 * k,
          borderRadius: 11 * k,
          backgroundColor: colors.logoCard,
          transform: [{ rotate: '-10deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 10 * k,
          top: 38 * k,
          width: 100 * k,
          height: 70 * k,
          borderRadius: 22 * k,
          backgroundColor: colors.logoBody,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 71 * k,
          top: 60 * k,
          width: 39 * k,
          height: 26 * k,
          borderTopLeftRadius: 13 * k,
          borderBottomLeftRadius: 13 * k,
          backgroundColor: colors.logoTab,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 78 * k,
          top: 66 * k,
          width: 14 * k,
          height: 14 * k,
          borderRadius: 7 * k,
          backgroundColor: colors.logoCoin,
        }}
      />
    </View>
  );
}

/** Vowels carrying sắc or huyền, mapped to the letter without the tone mark ("ı" is dotless i). */
const TONED: Record<string, string> = {
  á: 'a', à: 'a', é: 'e', è: 'e', í: 'ı', ì: 'ı', ó: 'o', ò: 'o', ú: 'u', ù: 'u', ý: 'y', ỳ: 'y',
};

type Piece = { text: string; toned: boolean };

/** Splits a name into plain runs and single toned vowels. Exported for tests. */
export function splitToneMarks(name: string): Piece[] {
  const pieces: Piece[] = [];
  for (const ch of name.normalize('NFC')) {
    if (TONED[ch]) pieces.push({ text: ch, toned: true });
    else if (pieces.length && !pieces[pieces.length - 1].toned) pieces[pieces.length - 1].text += ch;
    else pieces.push({ text: ch, toned: false });
  }
  return pieces;
}

/**
 * The wordmark: the app name in the brand face, with the sắc/huyền tone marks in the coin color.
 * Each toned vowel is drawn in the accent color and the bare letter is laid exactly over it, so
 * only the tone mark shows through. Names without tone marks ("My Wallet") render plainly.
 */
export function Wordmark({ name, size = 22, color }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const ink = color ?? colors.logoBody;
  const text = { fontFamily, fontSize: size, lineHeight: Math.round(size * 1.25), fontWeight: '800' as const, letterSpacing: -0.03 * size };
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={name}>
      {splitToneMarks(name).map((p, i) =>
        p.toned ? (
          <View key={i}>
            <Text style={[text, { color: colors.logoCoin }]}>{p.text}</Text>
            <Text style={[text, styles.overlay, { color: ink }]}>{TONED[p.text]}</Text>
          </View>
        ) : (
          <Text key={i} style={[text, { color: ink }]}>
            {p.text}
          </Text>
        ),
      )}
    </View>
  );
}

/** Mark and wordmark side by side, as in the brand book's primary lockup. */
export function BrandLockup({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <View style={styles.lockup}>
      <BrandMark size={Math.round(size * 1.5)} />
      <Wordmark name={name} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  overlay: { position: 'absolute', left: 0, top: 0 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
