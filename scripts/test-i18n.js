const fs = require('fs');

const viContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/vi.ts', 'utf8');
const enContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/en.ts', 'utf8');

function extractObject(content, pattern) {
  const match = content.match(pattern);
  if (!match) return null;
  try {
    return new Function('return ' + match[1])();
  } catch (e) {
    console.log('Parse error:', e.message);
    return null;
  }
}

const vi = extractObject(viContent, /export const vi = (\{[\s\S]*?\})\s*as\s*const/);
const en = extractObject(enContent, /export const en: Record<TranslationKey, string> = (\{[\s\S]*?\})\s*as\s*const/);

const dictionaries = { vi, en };

// FIXED translate function (same as i18n/index.ts after fix)
function translate(language, key, params) {
  const value = dictionaries[language][key];
  if (typeof value !== 'string') return key;
  return params ? value.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) : value;
}

const allKeys = [
  'login.title', 'login.subtitle', 'login.email', 'login.emailPlaceholder',
  'login.password', 'login.passwordPlaceholder', 'login.remember', 'login.forgot',
  'login.signIn', 'login.faceId', 'login.divider', 'login.appleId', 'login.google',
  'login.noAccount', 'login.signUp', 'login.securityBadge',
  'login.error.invalidCredentials', 'login.error.apiKey', 'login.error.network',
  'login.error.networkDesc', 'login.error.unknown', 'login.error.unexpected',
  'common.error',
  'register.title', 'register.subTitle', 'register.fullName', 'register.fullNamePlaceholder',
  'register.email', 'register.emailPlaceholder', 'register.password',
  'register.passwordPlaceholder', 'register.confirmPassword', 'register.confirmPlaceholder',
  'register.terms', 'register.privacy', 'register.privacyDesc',
  'register.signUp', 'register.divider', 'register.apple', 'register.google',
  'register.haveAccount', 'register.login', 'register.securityBadge',
  'register.error.fullName', 'register.error.agreeTerms', 'register.error.emailExists',
  'register.error.apiKey', 'register.error.network', 'register.error.networkDesc',
  'register.error.unknown', 'register.error.unexpected',
  'settings.language', 'settings.theme', 'settings.system',
  'settings.langVietnamese', 'settings.langEnglish', 'settings.light', 'settings.dark',
  'settings.signOut',
  'dashboard.analysis.structural',
  'dashboard.greeting.morning', 'dashboard.greeting.afternoon', 'dashboard.greeting.evening',
  'dashboard.alert.spentOf', 'dashboard.alert.used', 'dashboard.alert.limit',
  'budget.remaining', 'budget.spentOf',
];

console.log('=== VI ===');
let viOk = 0, viFail = 0;
for (const k of allKeys) {
  const result = translate('vi', k, { percent: '85', amount: '500,000' });
  const ok = result !== k;
  if (ok) viOk++; else viFail++;
  console.log(`${ok ? '✅' : '❌'} ${k} => ${result}`);
}
console.log(`\nVI: ${viOk} ok, ${viFail} fail`);

console.log('\n=== EN ===');
let enOk = 0, enFail = 0;
for (const k of allKeys) {
  const result = translate('en', k, { percent: '85', amount: '500,000' });
  const ok = result !== k;
  if (ok) enOk++; else enFail++;
  console.log(`${ok ? '✅' : '❌'} ${k} => ${result}`);
}
console.log(`\nEN: ${enOk} ok, ${enFail} fail`);

console.log(`\nTOTAL: ${viOk + enOk} ok, ${viFail + enFail} fail`);