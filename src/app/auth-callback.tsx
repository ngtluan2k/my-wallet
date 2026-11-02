import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/state/auth';
import { useTheme } from '@/theme';

/**
 * Landing route for email links (`mywallet://auth-callback?flow=…`). The link itself is handled by
 * the auth store, which reads the full URL (including the token fragment the router drops); this
 * screen waits for it, then sends the user to the app or back to sign-in.
 */
export default function AuthCallback() {
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const handling = useAuth((s) => s.handlingLink);
  if (user === undefined || handling) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Redirect href={user ? '/' : '/login'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
