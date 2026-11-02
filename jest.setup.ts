/* Shared mocks for component tests. Domain/state tests don't depend on these. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// The real client needs EXPO_PUBLIC_SUPABASE_* at import time; tests stub only what they call.
jest.mock('@/data/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    functions: { invoke: jest.fn() },
    from: jest.fn(),
  },
}));

// Icon fonts can't load under Jest; render the glyph name instead.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }: { name: string }) => React.createElement(Text, null, name);
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});
