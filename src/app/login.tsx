import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useT } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

export default function LoginScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const { signIn, signUp, loadRememberEmail, rememberEmail, setRememberEmail } = useAuth();
  const [email, setEmail] = useState(rememberEmail ?? '');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(!!rememberEmail);

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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll={false}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <AppText size={28} weight="700" style={[styles.title, { color: colors.text }]}>
              Ví Mình
            </AppText>
            <AppText tone="muted" size={15} style={styles.subtitle}>
              {isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập vào tài khoản của bạn'}
            </AppText>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
          </View>

          <View style={styles.rememberRow}>
            <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7} style={styles.checkboxContainer}>
              <View style={[styles.checkbox, rememberMe && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
              <AppText size={14} tone="muted">
                {t('auth.rememberMe')}
              </AppText>
            </TouchableOpacity>
          </View>

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
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { gap: spacing.lg, padding: spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 32 },
  subtitle: { textAlign: 'center' },
  inputGroup: { gap: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#ccc' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { },
  footer: { alignItems: 'center' },
  footerText: { textAlign: 'center' },
});