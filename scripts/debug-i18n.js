const fs = require('fs');

const viContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/vi.ts', 'utf8');
const enContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/en.ts', 'utf8');

// Check regex match
const viMatch = viContent.match(/export const vi = (\{[\s\S]*?\}) as const/);
const enMatch = enContent.match(/export const en: Record<TranslationKey, string> = (\{[\s\S]*?\}) as const/);

console.log('viMatch:', !!viMatch);
console.log('enMatch:', !!enMatch);

if (viMatch) {
  console.log('viMatch[1] first 100 chars:', viMatch[1].substring(0, 100));
}

// Try different approach - use Function constructor
try {
  const vi = new Function('return ' + viMatch[1])();
  console.log('\nvi keys count:', Object.keys(vi).length);
  console.log('vi sample keys:', Object.keys(vi).slice(0, 10));
  console.log('login.title:', vi['login.title']);
  console.log('common.error:', vi['common.error']);
} catch(e) {
  console.log('Error:', e.message);
}