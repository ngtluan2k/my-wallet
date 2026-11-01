const fs = require('fs');

const viContent = fs.readFileSync('D:/Projects/my-wallet/src/i18n/vi.ts', 'utf8');
const keyMatches = viContent.matchAll(/'([^']+)':/g);
const validKeys = new Set();
for (const m of keyMatches) validKeys.add(m[1]);

// Check login.tsx validate functions
const loginContent = fs.readFileSync('D:/Projects/my-wallet/src/app/login.tsx', 'utf8');
console.log('=== LOGIN.TSX VALIDATE KEYS ===');
const loginValidateKeys = loginContent.matchAll(/return '([^']+)'/g);
for (const m of loginValidateKeys) {
  const k = m[1];
  console.log(validKeys.has(k) ? '✅' : '❌', k);
}

// Check register.tsx validate functions
const regContent = fs.readFileSync('D:/Projects/my-wallet/src/app/register.tsx', 'utf8');
console.log('\n=== REGISTER.TSX VALIDATE KEYS ===');
const regValidateKeys = regContent.matchAll(/return '([^']+)'/g);
for (const m of regValidateKeys) {
  const k = m[1];
  console.log(validKeys.has(k) ? '✅' : '❌', k);
}

// Check render uses t()
console.log('\n=== RENDER CHECK ===');
const loginRenderChecks = [
  /errors\.email.*?Text[^>]*>/,
  /errors\.password.*?Text[^>]*>/,
];

const loginLines = loginContent.split('\n');
for (let i = 0; i < loginLines.length; i++) {
  const line = loginLines[i];
  if (line.includes('errors.email') && line.includes('styles.errorText')) {
    console.log('login.tsx:' + (i+1) + ':', line.trim());
  }
  if (line.includes('errors.password') && line.includes('styles.errorText')) {
    console.log('login.tsx:' + (i+1) + ':', line.trim());
  }
}

const regLines = regContent.split('\n');
for (let i = 0; i < regLines.length; i++) {
  const line = regLines[i];
  if ((line.includes('errors.fullName') || line.includes('errors.email') || 
       line.includes('errors.password') || line.includes('errors.confirmPassword')) && 
      line.includes('styles.errorText')) {
    console.log('register.tsx:' + (i+1) + ':', line.trim());
  }
}
