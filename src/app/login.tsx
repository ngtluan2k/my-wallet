import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/state/auth';
import { useT } from '@/i18n';
import { spacing } from '@/theme';

// Exact mockup colors
const C = {
  bg: '#f8f9ff',
  primary: '#006948',
  primaryContainer: '#00855d',
  onPrimary: '#ffffff',
  text: '#0b1c30',
  textMuted: '#3d4a42',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  outline: '#6d7a72',
  appleBg: '#0b1c30',
  googleBg: '#ffffff',
  dividerText: '#6d7a72',
};

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
  // ── Header ──────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.4,
    color: C.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
    color: C.textMuted,
  },
  // ── Form ────────────────────────────────────────────────────────
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: C.text,
    paddingLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: C.surfaceMuted,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    color: C.outline,
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
    right: spacing.md,
    padding: 4,
  },
  // ── Remember row ────────────────────────────────────────────────
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#bccac0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
    color: C.primary,
  },
  // ── Primary button ──────────────────────────────────────────────
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnTxt: {
    color: C.onPrimary,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  // ── Face ID button ──────────────────────────────────────────────
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
    color: C.primary,
  },
  // ── Divider ─────────────────────────────────────────────────────
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
    fontWeight: '500',
    color: C.dividerText,
    backgroundColor: C.bg,
    paddingHorizontal: spacing.sm,
  },
  // ── Social buttons ──────────────────────────────────────────────
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerTxt: {
    fontSize: 15,
    lineHeight: 21,
    color: C.textMuted,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },
  secBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  secBadgeTxt: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: C.outline,
  },
});

export default function LoginScreen() {
  const { t } = useT();
  const { signIn, signUp, loadRememberEmail, rememberEmail, setRememberEmail } = useAuth();
  const [email, setEmail] = useState(rememberEmail ?? '');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!rememberEmail);
  const [showPassword, setShowPassword] = useState(false);

  // ── Animations ─────────────────────────────────────────────────
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
      // Card fades in
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardY,   { toValue: 0,   duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(60),
      // Logo bounces + text fades
      Animated.parallel([
        Animated.timing(logoSc, { toValue: 1, duration: 420, easing: Easing.out(Easing.elastic(1)), useNativeDriver: true }),
        Animated.timing(txtOp,  { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic),     useNativeDriver: true }),
      ]),
      Animated.delay(100),
      // Inputs slide in
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
    Animated.timing(socSc, { toValue: to, duration: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

  async function handleAuth() {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
      if (error) return;
      if (rememberMe) await setRememberEmail(email);
      else await useAuth.getState().clearRememberEmail();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
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
              <Ionicons name="wallet-outline" size={30} color={C.onPrimary} />
            </Animated.View>
            <Animated.View style={{ opacity: txtOp, transform: [{ translateY: txtOp.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
              <Text style={styles.title}>Chào mừng trở lại!</Text>
            </Animated.View>
            <Animated.View style={{ opacity: txtOp }}>
              <Text style={styles.subtitle}>Đăng nhập để tiếp tục quản lý tài chính thông minh & an toàn.</Text>
            </Animated.View>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>

            {/* Email */}
            <Animated.View style={[styles.inputGroup, { opacity: i1Op, transform: [{ translateX: i1Op.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
              <Text style={styles.inputLabel}>Email hoặc Số điện thoại</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="vidu@email.com hoặc 0912..."
                  placeholderTextColor={C.outline}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </Animated.View>

            {/* Password */}
            <Animated.View style={[styles.inputGroup, { opacity: i2Op, transform: [{ translateX: i2Op.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 44 }]}
                  placeholder="Nhập mật khẩu của bạn"
                  placeholderTextColor={C.outline}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.pwToggle}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.outline} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Remember + Forgot */}
            <Animated.View style={[styles.rememberRow, { opacity: remOp }]}>
              <TouchableOpacity onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
                <View style={styles.checkboxRow}>
                  <Animated.View style={[styles.checkbox, rememberMe && styles.checkboxOn, { transform: [{ scale: rememberMe ? 1.08 : 1 }] }]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color={C.onPrimary} />}
                  </Animated.View>
                  <Text style={styles.rememberTxt}>Ghi nhớ đăng nhập</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.forgotTxt}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Sign In button */}
            <Animated.View style={{ transform: [{ scale: btnSc }] }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { opacity: loading ? 0.72 : 1 }]}
                onPressIn={() => onPressBtn(0.97)}
                onPressOut={() => onPressBtn(1)}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryBtnTxt, { opacity: loading ? 0.8 : 1 }]}>
                  {isSignUp ? t('common.signUp') : t('common.signIn')}
                </Text>
                {!loading && <Ionicons name="arrow-forward" size={20} color={C.onPrimary} />}
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
                <Text style={styles.faceBtnTxt}>Đăng nhập bằng Face ID</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerTxt}>Hoặc tiếp tục với</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social ── */}
          <View style={styles.socialRow}>
            <Animated.View style={{ flex: 1, transform: [{ scale: socSc }] }}>
              <TouchableOpacity
                style={[styles.socialBtn, styles.appleBtn]}
                onPressIn={() => onPressSoc(0.96)}
                onPressOut={() => onPressSoc(1)}
                activeOpacity={0.82}
              >
                <Ionicons name="logo-apple" size={16} color="#ffffff" />
                <Text style={[styles.socialTxt, { color: '#ffffff' }]}>Apple ID</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ flex: 1, transform: [{ scale: socSc }] }}>
              <TouchableOpacity
                style={[styles.socialBtn, styles.googleBtn]}
                onPressIn={() => onPressSoc(0.96)}
                onPressOut={() => onPressSoc(1)}
                activeOpacity={0.82}
              >
                <Ionicons name="logo-google" size={16} color="#4285F4" />
                <Text style={[styles.socialTxt, { color: '#0b1c30' }]}>Google</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerTxt}>
              {isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
              <Text style={styles.footerLink} onPress={() => setIsSignUp(v => !v)}>
                {isSignUp ? 'Đăng nhập' : 'Đăng ký ngay'}
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
  );
}