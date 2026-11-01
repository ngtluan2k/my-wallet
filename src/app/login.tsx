import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useT } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

export default function LoginScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { signIn, signUp, loadRememberEmail, rememberEmail, setRememberEmail } = useAuth();
  const [email, setEmail] = useState(rememberEmail ?? '');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(!!rememberEmail);

  // Animated values for entrance animation (standard React Native pattern)
  const fadeAnim = useRef(new Animated.Value(0));
  const slideAnim = useRef(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim.current, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim.current, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    loadRememberEmail();
  }, [loadRememberEmail]);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert(t('common.error'), 'Email và mật khẩu bắt buộc');
      return;
    }
    setLoading(true);
    try {
      const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
      if (error) {
        Alert.alert(t('common.error'), error.message);
      } else {
        if (rememberMe) {
          await setRememberEmail(email);
        } else {
          await useAuth.getState().clearRememberEmail();
        }
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  }

  const cardWidth = width * 0.92;
  // eslint-disable-next-line react-hooks/refs
  const slideY = slideAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View style={[styles.background, { backgroundColor: colors.background }]}>
        {/* Decorative background circles */}
        <View style={[styles.circle, { opacity: 0.15, width: width * 0.8, height: width * 0.8, top: -width * 0.3, left: -width * 0.3 }]} />
        <View style={[styles.circle, { opacity: 0.1, width: width * 0.6, height: width * 0.6, bottom: -width * 0.2, right: -width * 0.2 }]} />

        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              backgroundColor: colors.surface,
              // eslint-disable-next-line react-hooks/refs
              opacity: fadeAnim.current,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <View style={styles.header}>
            <AppText weight="700" size={34} style={[styles.title, { color: colors.text }]}>
              Ví Mình
            </AppText>
            <AppText tone="muted" size={15} style={styles.subtitle}>
              {isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập vào tài khoản của bạn'}
            </AppText>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border, 
                color: colors.text,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: 14,
                fontSize: 16,
              }]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border, 
                color: colors.text,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: 14,
                fontSize: 16,
              }]}
              placeholder="Mật khẩu"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
          </View>

          <TouchableOpacity 
            onPress={() => setRememberMe(!rememberMe)} 
            activeOpacity={0.7} 
            style={styles.rememberMeContainer}
          >
            <View style={styles.checkboxWrapper}>
              <Animated.View style={[styles.checkbox, rememberMe && { backgroundColor: colors.primary, borderColor: colors.primary, transform: [{ scale: 1.1 }] }]} />
            </View>
            <AppText size={14} weight={rememberMe ? "600" : "400"} tone="default">
              {t('auth.rememberMe')}
            </AppText>
          </TouchableOpacity>

          <Button label={isSignUp ? t('common.signUp') : t('common.signIn')} onPress={handleAuth} disabled={loading} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText tone="muted" size={12} style={styles.dividerText}>
              hoặc
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label={isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
            variant="secondary"
            onPress={() => setIsSignUp(!isSignUp)}
          />

          <View style={styles.footer}>
            <AppText tone="muted" size={12} style={styles.footerText}>
              {t('auth.footer')}
            </AppText>
          </View>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1 },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: '#0F766E' },
  card: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderRadius: radius.lg,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { 
    fontSize: 34, 
    fontWeight: '700', 
    lineHeight: 41,
  },
  subtitle: { 
    textAlign: 'center', 
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  inputGroup: { gap: spacing.md },
  input: { 
    borderWidth: 1, 
    borderRadius: radius.md, 
    paddingHorizontal: spacing.md, 
    paddingVertical: 14, 
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  rememberMeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm, 
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  checkboxWrapper: { 
    width: 22, 
    height: 22, 
    borderRadius: 6, 
    borderWidth: 2, 
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkbox: { 
    width: 12, 
    height: 12, 
    borderRadius: 3, 
    backgroundColor: 'transparent',
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { },
  footer: { alignItems: 'center', marginTop: spacing.md },
  footerText: { textAlign: 'center' },
});