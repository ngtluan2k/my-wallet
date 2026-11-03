import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { BrandMark } from './brand';
import { AppText, TextField } from './ui';

/** Shared frame for sign-in, sign-up and password reset. */
export function AuthLayout({
  title,
  subtitle,
  eyebrow,
  back,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  /** Small chip above the title (sign-up: "Start your financial journey"). */
  eyebrow?: string;
  back?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          {back ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              style={[styles.back, { backgroundColor: colors.surfaceMuted }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.secure}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
            <AppText tone="muted" size={13}>
              {t('auth.encrypted')}
            </AppText>
          </View>
        </View>

        <View style={styles.header}>
          <BrandMark size={72} style={styles.logo} />
          {eyebrow && (
            <View style={[styles.eyebrow, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <AppText tone="primary" size={13} weight="600">
                {eyebrow}
              </AppText>
            </View>
          )}
          <AppText size={28} weight="700" style={styles.centerText}>
            {title}
          </AppText>
          <AppText tone="muted" size={16} style={styles.centerText}>
            {subtitle}
          </AppText>
        </View>

        <View style={styles.form}>{children}</View>

        <View style={styles.footer}>
          {footer}
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
            <AppText tone="muted" size={12} style={styles.badgeText}>
              {t('auth.badge')}
            </AppText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Password field with a show/hide toggle. */
export function PasswordField(props: Omit<React.ComponentProps<typeof TextField>, 'secureTextEntry' | 'right'>) {
  const [visible, setVisible] = useState(false);
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <TextField
      {...props}
      icon="lock-closed-outline"
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
        </Pressable>
      }
    />
  );
}

/** Inline banner for form-level errors and notices. */
export function FormNotice({ message, tone }: { message: string; tone: 'danger' | 'primary' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: tone === 'danger' ? colors.dangerSoft : colors.primarySoft }]}>
      <Ionicons
        name={tone === 'danger' ? 'alert-circle-outline' : 'mail-outline'}
        size={18}
        color={tone === 'danger' ? colors.danger : colors.primary}
      />
      <AppText tone={tone} size={14} style={styles.flex}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.xl },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', gap: spacing.sm },
  logo: { marginBottom: spacing.sm },
  centerText: { textAlign: 'center' },
  form: { gap: spacing.md },
  footer: { marginTop: 'auto', alignItems: 'center', gap: spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md },
  badgeText: { textAlign: 'center', flexShrink: 1 },
  notice: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, alignItems: 'flex-start' },
});
