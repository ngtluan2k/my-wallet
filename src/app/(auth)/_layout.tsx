import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

// The group has no index route, so when the root guard sends a signed-out user here
// (e.g. from "/"), the stack must know which screen to open first.
export const unstable_settings = { initialRouteName: 'login' };

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot" />
    </Stack>
  );
}
