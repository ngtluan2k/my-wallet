import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Animated, Easing, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/state/auth';
import { spacing } from '@/theme';
import { useT } from '@/i18n';

// Mockup colors
const C = {
  bg: '#f8f9ff',
  primary: '#006948',
  onPrimary: '#ffffff',
  text: '#0b1c30',
  textMuted: '#3d4a42',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  outline: '#6d7a72',
  appleBg: '#0b1c30',
  googleBg: '#ffffff',
  dividerText: '#6d7a72',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
};

// Validation helpers
function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'common.email_required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'common.email_invalid';
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'common.password_length_error';
  if (password.length < 8) return 'common.password_length_error';
  return undefined;
}

function sanitizeInput(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl + 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
    color: C.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
    color: C.textMuted,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: C.text,
  },
  required: {
    fontSize: 14,
    fontWeight: '700',
    color: C.error,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: C.surfaceMuted,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
  },
  inputRowError: {
    borderColor: C.error,
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.sm,
    color: C.textMuted,
    fontSize: 20,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
    height: '100%',
    paddingLeft: 44,
    paddingRight: spacing.md,
    color: C.text,
  },
  pwToggle: {
    position: 'absolute',
    right: spacing.sm,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    color: C.error,
    marginTop: 4,
    paddingLeft: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  rememberTxt: {
    fontSize: 13,
    lineHeight: 18,
    color: C.textMuted,
  },
  forgotTxt: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: C.primary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtnTxt: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  faceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceMuted,
    gap: 8,
    marginTop: spacing.sm,
  },
  faceBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: C.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerTxt: {
    fontSize: 13,
    fontWeight: '400',
    color: C.dividerText,
    backgroundColor: C.bg,
    paddingHorizontal: spacing.sm,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  appleBtn: {
    backgroundColor: C.appleBg,
    borderColor: C.appleBg,
  },
  googleBtn: {
    backgroundColor: C.googleBg,
    borderColor: C.border,
  },
  socialTxt: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerTxt: {
    fontSize: 14,
    lineHeight: 20,
    color: C.textMuted,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: C.primary,
  },
  secBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  secBadgeTxt: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: C.outline,
  },
});

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { signIn, loadRememberEmail, rememberEmail, setRememberEmail } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState(rememberEmail ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!rememberEmail);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [cardFade] = useState(() => new Animated.Value(0));
  const [cardY] = useState(() => new Animated.Value(24));
  const [logoSc] = useState(() => new Animated.Value(0));
  const [txtOp] = useState(() => new Animated.Value(0));
  const [i1Op] = useState(() => new Animated.Value(0));
  const [i2Op] = useState(() => new Animated.Value(0));
  const [remOp] = useState(() => new Animated.Value(0));
  const [btnSc] = useState(() => new Animated.Value(1));
  const [faceOp] = useState(() => new Animated.Value(0));
  const [socSc] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(60),
      Animated.parallel([
        Animated.timing(logoSc, { toValue: 1, duration: 420, easing: Easing.out(Easing.elastic(1)), useNativeDriver: true }),
        Animated.timing(txtOp, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(i1Op, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(70),
        Animated.timing(i2Op, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(60),
      Animated.timing(remOp, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(60),
      Animated.timing(faceOp, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    seq.start();
    loadRememberEmail();
  }, [cardFade, cardY, logoSc, txtOp, i1Op, i2Op, remOp, faceOp, loadRememberEmail]);

  const onPressBtn = (to: number) =>
    Animated.timing(btnSc, { toValue: to, duration: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  const onPressSoc = (to: number) =>
    Animated.timing(socSc, { toValue: to, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

  function handleBlur(field: keyof FormErrors, value: string) {
    setTouched(prev => ({ ...prev, [field]: true }));
    let error: string | undefined = undefined;
    switch (field) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  }

  async function handleSignIn() {
    const newErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    
    setErrors(newErrors);
    setTouched({ email: true, password: true });
    
    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      console.log('[Login] Validation errors:', newErrors);
      return;
    }

    setLoading(true);
    try {
      const sanitizedEmail = sanitizeInput(email);
      console.log('[Login] Attempting sign in...');
      const { error } = await signIn(sanitizedEmail, password);
      if (error) {
        console.error('[Login] Sign in failed:', error);
        // Show error to user
        if (error.message?.includes('Invalid login credentials')) {
          setErrors(prev => ({ ...prev, password: 'login.error.invalidCredentials' }));
        } else if (error.message?.includes('Invalid API key')) {
          Alert.alert(t('common.error'), t('login.error.apiKey'));
        } else if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
          Alert.alert(t('login.error.network'), t('login.error.networkDesc'));
        } else {
          setErrors(prev => ({ ...prev, email: error.message || t('login.error.unknown') }));
        }
        return;
      }
      console.log('[Login] Sign in successful');
      if (rememberMe) await setRememberEmail(sanitizedEmail);
      else await useAuth.getState().clearRememberEmail();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[Login] Unexpected error:', err);
      Alert.alert(t('common.error'), t('login.error.unexpected'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardY }] }}>

            {/* ── Logo + Title ── */}
            <View style={styles.header}>
              <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoSc }] }]}>
                <Ionicons name="wallet-outline" size={30} color="#ffffff" />
              </Animated.View>
              <Animated.View style={{ opacity: txtOp, transform: [{ translateY: txtOp.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
                <Text style={styles.title}>{t('login.title')}</Text>
              </Animated.View>
              <Animated.View style={{ opacity: txtOp }}>
                <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
              </Animated.View>
            </View>

            {/* ── Form ── */}
            <View style={styles.form}>

              {/* Email */}
              <Animated.View style={[styles.inputGroup, { opacity: i1Op, transform: [{ translateX: i1Op.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{t('login.email')}</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={[styles.inputRow, errors.email && styles.inputRowError]}>
                  <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.emailPlaceholder')}
                    placeholderTextColor={`${C.outline}b3`}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    onBlur={() => handleBlur('email', email)}
                  />
                </View>
                {touched.email && errors.email && (
                  <Text style={styles.errorText}>{t(errors.email)}</Text>
                )}
              </Animated.View>

              {/* Password */}
              <Animated.View style={[styles.inputGroup, { opacity: i2Op, transform: [{ translateX: i2Op.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{t('login.password')}</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={[styles.inputRow, errors.password && styles.inputRowError]}>
                  <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor={`${C.outline}b3`}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    onBlur={() => handleBlur('password', password)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.pwToggle}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
                {touched.password && errors.password && (
                  <Text style={styles.errorText}>{t(errors.password)}</Text>
                )}
              </Animated.View>

              {/* Remember + Forgot */}
              <Animated.View style={[styles.rememberRow, { opacity: remOp }]}>
                <TouchableOpacity onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
                  <View style={styles.checkboxRow}>
                    <Animated.View style={[styles.checkbox, rememberMe && styles.checkboxOn, { transform: [{ scale: rememberMe ? 1.08 : 1 }] }]}>
                      {rememberMe && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                    </Animated.View>
                    <Text style={styles.rememberTxt}>{t('login.remember')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotTxt}>{t('login.forgot')}</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Sign In button */}
              <Animated.View style={{ transform: [{ scale: btnSc }] }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { opacity: loading ? 0.72 : 1 }]}
                  onPressIn={() => onPressBtn(0.97)}
                  onPressOut={() => onPressBtn(1)}
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.primaryBtnTxt, { opacity: loading ? 0.8 : 1 }]}>
                    {t('login.signIn')}
                  </Text>
                  {!loading && <Ionicons name="arrow-forward" size={20} color="#ffffff" />}
                </TouchableOpacity>
              </Animated.View>

              {/* Face ID button */}
              <Animated.View style={{ opacity: faceOp, transform: [{ translateY: faceOp.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
                <TouchableOpacity
                  style={styles.faceBtn}
                  onPressIn={() => onPressBtn(0.97)}
                  onPressOut={() => onPressBtn(1)}
                  activeOpacity={0.82}
                >
                  <Ionicons name="lock-open-outline" size={20} color={C.primary} />
                  <Text style={styles.faceBtnTxt}>{t('login.faceId')}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* ── Divider ── */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerTxt}>{t('login.divider')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Social ── */}
            <View style={styles.socialRow}>
              <Animated.View style={{ flex: 1, transform: [{ scale: socSc }] }}>
                <TouchableOpacity
                  style={[styles.socialBtn, styles.appleBtn]}
                  onPressIn={() => onPressSoc(0.95)}
                  onPressOut={() => onPressSoc(1)}
                  activeOpacity={0.82}
                >
                  <Ionicons name="logo-apple" size={16} color="#ffffff" />
                  <Text style={[styles.socialTxt, { color: '#ffffff' }]}>{t('login.appleId')}</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ flex: 1, transform: [{ scale: socSc }] }}>
                <TouchableOpacity
                  style={[styles.socialBtn, styles.googleBtn]}
                  onPressIn={() => onPressSoc(0.95)}
                  onPressOut={() => onPressSoc(1)}
                  activeOpacity={0.82}
                >
                  <Ionicons name="logo-google" size={16} color="#4285F4" />
                  <Text style={[styles.socialTxt, { color: C.text }]}>Google</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
              <Text style={styles.footerTxt}>
                Chưa có tài khoản?{' '}
                <Text style={styles.footerLink} onPress={() => router.replace('/register')}>
                  Đăng ký ngay
                </Text>
              </Text>
              <View style={styles.secBadge}>
                <Ionicons name="shield-outline" size={14} color={C.outline} />
                <Text style={styles.secBadgeTxt}>Bảo mật dữ liệu 100% cục bộ & mã hóa thiết bị</Text>
              </View>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
