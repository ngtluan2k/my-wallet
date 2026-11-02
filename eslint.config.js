// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/**'],
  },
  {
    rules: {
      // supabase-js only ships a `.cjs` main plus `exports`, which eslint-plugin-import's resolver can't follow.
      'import/no-unresolved': ['error', { ignore: ['^@supabase/supabase-js$'] }],
    },
  },
]);
