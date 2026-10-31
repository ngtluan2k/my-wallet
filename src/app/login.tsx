import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useT } from '@/i18n';
import { spacing, useTheme } from '@/theme';

export default function LoginScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert(t('common.error'), 'Email and password required');
      return;
    }
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);
      if (error) {
        Alert.alert(t('common.error'), error.message);
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <AppText size={24} weight="700" style={styles.title}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </AppText>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button label={isSignUp ? 'Sign Up' : 'Sign In'} onPress={handleAuth} disabled={loading} />
        <Button
          label={isSignUp ? 'Already have account? Sign in' : "Don't have account? Sign up"}
          variant="secondary"
          onPress={() => setIsSignUp(!isSignUp)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, padding: spacing.xl },
  title: { textAlign: 'center', marginBottom: spacing.lg },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 16 },
});