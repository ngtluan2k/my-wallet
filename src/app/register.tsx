import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Animated, Easing, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/state/auth';
import { spacing } from '@/theme';

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

type StrengthLevel = 'weak' | 'medium' | 'strong';
function getPasswordStrength(password: string): { level: StrengthLevel; color: string; label: string; hint: string } {
  if (!password) return { level: 'weak', color: C.border, label: 'Chưa nhập', hint: 'Ít nhất 8 ký tự' };
  
  let score = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isLongEnough = password.length >= 8;
  
  if (isLongEnough) score++;
  if (hasLower && hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;
  if (password.length >= 12) score++;
  
  if (score >= 4) return { level: 'strong', color: C.success, label: 'Rất an toàn', hint: 'Tuyệt vời!' };
  if (score >= 2) return { level: 'medium', color: C.warning, label: 'Khá an toàn', hint: 'Thêm ký tự đặc biệt' };
  return { level: 'weak', color: C.error, label: 'Yếu', hint: 'Ít nhất 8 ký tự, thêm hoa thường số' };
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Vui lòng nhập email';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email không hợp lệ';
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Vui lòng nhập mật khẩu';
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) return 'Vui lòng nhập lại mật khẩu';
  if (password !== confirmPassword) return 'Mật khẩu không khớp';
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
    paddingTop: 16,
    paddingBottom: 48,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${C.primary}1a`,
    borderWidth: 1,
    borderColor: `${C.primary}33`,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  subBadgeTxt: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    color: C.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
    color: C.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: C.textMuted,
    maxWidth: 340,
  },
  formCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    padding: 0,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
  inputRowSuccess: {
    borderColor: C.success,
    backgroundColor: '#f0fdf4',
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
  strengthMeter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  strengthBar: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  strengthInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    color: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strengthHint: {
    fontSize: 11,
    lineHeight: 14,
    color: C.outline,
  },
  termsSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  termsCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsCheckboxOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  termsTxt: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: C.textMuted,
  },
  termsLink: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    textDecorationLine: 'underline',
  },
  privacyShield: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: `${C.bg}`,
    borderWidth: 1,
    borderColor: C.border,
  },
  privacyShieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${C.primary}1a`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyShieldTxt1: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: C.text,
  },
  privacyShieldTxt2: {
    fontSize: 12,
    lineHeight: 16,
    color: C.textMuted,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    gap: 8,
    marginBottom: spacing.lg,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryBtnTxt: {
    color: C.onPrimary,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
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
    paddingHorizontal: spacing.sm,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    paddingHorizontal: spacing.sm,
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
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
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
});

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [cardFade] = useState(() => new Animated.Value(0));
  const [cardY] = useState(() => new Animated.Value(24));
  const [txtOp] = useState(() => new Animated.Value(0));
  const [i1Op] = useState(() => new Animated.Value(0));
  const [i2Op] = useState(() => new Animated.Value(0));
  const [i3Op] = useState(() => new Animated.Value(0));
  const [i4Op] = useState(() => new Animated.Value(0));
  const [btnSc] = useState(() => new Animated.Value(1));
  const [socSc] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(60),
      Animated.parallel([
        Animated.timing(txtOp, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(i1Op, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(50),
        Animated.timing(i2Op, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(50),
        Animated.timing(i3Op, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(50),
        Animated.timing(i4Op, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    seq.start();
  }, [cardFade, cardY, txtOp, i1Op, i2Op, i3Op, i4Op]);

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
      case 'confirmPassword':
        error = validateConfirmPassword(password, value);
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  }

  function handleChange(field: keyof FormErrors, setter: (v: string) => void, value: string) {
    setter(value);
    if (touched[field]) {
      let error: string | undefined = undefined;
      switch (field) {
        case 'email':
          error = validateEmail(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(password, value);
          break;
        default:
          break;
      }
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }

  async function handleSignUp() {
    const newErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    
    if (!fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên';
    if (!agreed) newErrors.confirmPassword = 'Vui lòng đồng ý điều khoản';
    
    setErrors(newErrors);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    
    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      console.log('[Register] Validation errors:', newErrors);
      return;
    }

    setLoading(true);
    try {
      const sanitizedEmail = sanitizeInput(email);
      console.log('[Register] Attempting sign up...');
      const { error } = await signUp(sanitizedEmail, password);
      if (error) {
        console.error('[Register] Sign up failed:', error);
        // Show user-friendly error messages
        if (error.message?.includes('user already registered') || error.message?.includes('already exists')) {
          setErrors(prev => ({ ...prev, email: 'Email đã được sử dụng' }));
        } else if (error.message?.includes('Invalid API key')) {
          Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại cấu hình Supabase.');
        } else if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
          Alert.alert('Lỗi kết nối', 'Không thể kết nối đến mạng. Vui lòng kiểm tra kết nối Internet.');
        } else {
          setErrors(prev => ({ ...prev, email: error.message || 'Đăng ký thất bại' }));
        }
        return;
      }
      console.log('[Register] Sign up successful');
      // After successful registration, sign in automatically
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[Register] Unexpected error:', err);
      Alert.alert('Lỗi', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const strength = getPasswordStrength(password);
  const confirmError = touched.confirmPassword ? validateConfirmPassword(password, confirmPassword) : undefined;

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

            {/* ── Header ── */}
            <View>
              <Animated.View style={[styles.subBadge, { opacity: txtOp }]}>
                <Ionicons name="star" size={14} color={C.primary} />
                <Text style={styles.subBadgeTxt}>Bắt đầu hành trình tài chính</Text>
              </Animated.View>
              <Animated.View style={{ opacity: txtOp, transform: [{ translateY: txtOp.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
                <Text style={styles.title}>Tạo tài khoản mới</Text>
              </Animated.View>
            </View>

            {/* ── Form Card ── */}
            <View style={styles.formCard}>

              {/* Field 1: Họ và tên */}
              <Animated.View style={[styles.inputGroup, { opacity: i1Op, transform: [{ translateX: i1Op.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Họ và tên</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nguyễn Văn Nam"
                    placeholderTextColor={`${C.outline}b3`}
                    value={fullName}
                    onChangeText={(v) => handleChange('fullName' as never, setFullName, v)}
                    autoCapitalize="words"
                    onBlur={() => {
                      if (!fullName.trim()) {
                        setTouched(prev => ({ ...prev, fullName: true }));
                        setErrors(prev => ({ ...prev, fullName: 'Vui lòng nhập họ tên' }));
                      }
                    }}
                  />
                </View>
                {touched.fullName && errors.fullName && (
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                )}
              </Animated.View>

              {/* Field 2: Email */}
              <Animated.View style={[styles.inputGroup, { opacity: i2Op, transform: [{ translateX: i2Op.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={[styles.inputRow, errors.email && styles.inputRowError]}>
                  <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor={`${C.outline}b3`}
                    value={email}
                    onChangeText={(v) => handleChange('email' as never, setEmail, v)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    onBlur={() => handleBlur('email', email)}
                  />
                </View>
                {touched.email && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </Animated.View>

              {/* Field 3: Password */}
              <Animated.View style={[styles.inputGroup, { opacity: i3Op, transform: [{ translateX: i3Op.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Mật khẩu</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={[styles.inputRow, errors.password && styles.inputRowError]}>
                  <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder="Ít nhất 8 ký tự"
                    placeholderTextColor={`${C.outline}b3`}
                    value={password}
                    onChangeText={(v) => handleChange('password' as never, setPassword, v)}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    onBlur={() => handleBlur('password', password)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.pwToggle}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                {password.length > 0 && (
                  <View style={styles.strengthMeter}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3].map(i => (
                        <View 
                          key={i} 
                          style={[
                            styles.strengthBar, 
                            { 
                              backgroundColor: strength.color,
                              opacity: password.length >= i * 4 ? 1 : 0.2
                            } 
                          ]} 
                        />
                      ))}
                    </View>
                    <View style={styles.strengthInfo}>
                      <Text style={[styles.strengthText, { color: strength.color }]}>
                        <Ionicons name="shield-checkmark" size={13} color={strength.color} />
                        {strength.label}
                      </Text>
                      <Text style={styles.strengthHint}>{strength.hint}</Text>
                    </View>
                  </View>
                )}
                
                {touched.password && errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </Animated.View>

              {/* Field 4: Confirm password */}
              <Animated.View style={[styles.inputGroup, { opacity: i4Op, transform: [{ translateX: i4Op.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Xác nhận mật khẩu</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={[styles.inputRow, touched.confirmPassword && !confirmError && styles.inputRowSuccess, touched.confirmPassword && confirmError && styles.inputRowError]}>
                  <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor={`${C.outline}b3`}
                    value={confirmPassword}
                    onChangeText={(v) => handleChange('confirmPassword' as never, setConfirmPassword, v)}
                    secureTextEntry
                    autoComplete="new-password"
                    onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                  />
                  {confirmPassword && !confirmError && (
                    <Ionicons name="checkmark-circle" size={20} color={C.success} style={styles.pwToggle} />
                  )}
                </View>
                {touched.confirmPassword && errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </Animated.View>

            </View>

            {/* ── Terms & Privacy ── */}
            <View style={styles.termsSection}>
              <TouchableOpacity onPress={() => setAgreed(v => !v)} activeOpacity={0.7}>
                <View style={styles.termsCheckboxRow}>
                  <View style={[styles.termsCheckbox, agreed && styles.termsCheckboxOn]}>
                    {agreed && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </View>
                  <Text style={styles.termsTxt}>
                    Tôi đồng ý với{' '}
                    <Text style={styles.termsLink}>Điều khoản dịch vụ</Text>{' '}
                    và{' '}
                    <Text style={styles.termsLink}>Chính sách quyền riêng tư</Text>{' '}
                    của Ví Mình.
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.privacyShield}>
                <View style={styles.privacyShieldIcon}>
                  <Ionicons name="shield" size={18} color={C.primary} />
                </View>
                <View>
                  <Text style={styles.privacyShieldTxt1}>Offline-first & Bảo mật riêng tư</Text>
                  <Text style={styles.privacyShieldTxt2}>Dữ liệu tài chính được mã hóa cục bộ trên thiết bị của bạn.</Text>
                </View>
              </View>
            </View>

            {/* ── Sign Up button ── */}
            <Animated.View style={{ transform: [{ scale: btnSc }] }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { opacity: loading ? 0.72 : 1 }]}
                onPressIn={() => onPressBtn(0.98)}
                onPressOut={() => onPressBtn(1)}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryBtnTxt, { opacity: loading ? 0.8 : 1 }]}>Đăng ký tài khoản</Text>
                {!loading && <Ionicons name="arrow-forward" size={20} color={C.onPrimary} />}
              </TouchableOpacity>
            </Animated.View>

            {/* ── Divider ── */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerTxt}>Hoặc đăng ký nhanh bằng</Text>
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
                  <Ionicons name="logo-apple" size={18} color="#ffffff" />
                  <Text style={[styles.socialTxt, { color: '#ffffff' }]}>Apple</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ flex: 1, transform: [{ scale: socSc }] }}>
                <TouchableOpacity
                  style={[styles.socialBtn, styles.googleBtn]}
                  onPressIn={() => onPressSoc(0.95)}
                  onPressOut={() => onPressSoc(1)}
                  activeOpacity={0.82}
                >
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                  <Text style={[styles.socialTxt, { color: C.text }]}>Google</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
              <Text style={styles.footerTxt}>
                Đã có tài khoản?{' '}
                <Text style={styles.footerLink} onPress={() => router.replace('/login')}>
                  Đăng nhập
                  <Ionicons name="chevron-forward" size={16} color={C.primary} />
                </Text>
              </Text>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
