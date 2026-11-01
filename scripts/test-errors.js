const fs = require('fs');

const viContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/vi.ts', 'utf8');
const enContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/en.ts', 'utf8');

const vi = new Function('return ' + viContent.match(/export const vi = ({[\s\S]*?})\s*as\s*const/)[1])();
const en = new Function('return ' + enContent.match(/export const en: Record<TranslationKey, string> = ({[\s\S]*?})\s*as\s*const/)[1])();

const dictionaries = { vi, en };

function translate(language, key, params) {
  const value = dictionaries[language][key];
  if (typeof value !== 'string') return key;
  return params ? value.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) : value;
}

console.log('=== LOGIN VALIDATION (VI) ===');
console.log('Email empty:', translate('vi', 'form.error.email_required'));
console.log('Email invalid:', translate('vi', 'form.error.email_invalid'));
console.log('Password empty:', translate('vi', 'form.error.password_required'));
console.log('Password short:', translate('vi', 'form.error.password_too_short'));

console.log('\n=== REGISTER VALIDATION (VI) ===');
console.log('Full name empty:', translate('vi', 'register.error.fullName'));
console.log('Agree terms:', translate('vi', 'register.error.agreeTerms'));
console.log('Email empty:', translate('vi', 'form.error.email_required'));
console.log('Email invalid:', translate('vi', 'form.error.email_invalid'));
console.log('Password empty:', translate('vi', 'form.error.password_required'));
console.log('Password short:', translate('vi', 'form.error.password_too_short'));
console.log('Confirm empty:', translate('vi', 'form.error.confirm_required'));
console.log('Confirm mismatch:', translate('vi', 'form.error.confirm_mismatch'));

console.log('\n=== ENGLISH ===');
console.log('Email empty:', translate('en', 'form.error.email_required'));
console.log('Password short:', translate('en', 'form.error.password_too_short'));
console.log('Confirm mismatch:', translate('en', 'form.error.confirm_mismatch'));