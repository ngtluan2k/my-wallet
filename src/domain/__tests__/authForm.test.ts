import {
  displayNameError,
  emailError,
  hasErrors,
  initials,
  normalizeEmail,
  passwordChangeErrors,
  signInErrors,
  signUpErrors,
} from '../authForm';

describe('auth form validation', () => {
  it('normalizes and checks emails', () => {
    expect(normalizeEmail('  Minh@Example.COM ')).toBe('minh@example.com');
    expect(emailError('')).toBe('email_required');
    expect(emailError('minh@')).toBe('email_invalid');
    expect(emailError(' minh@example.com ')).toBeUndefined();
  });

  it('only requires a password to sign in', () => {
    expect(signInErrors('a@b.co', '')).toEqual({ email: undefined, password: 'password_required' });
    expect(hasErrors(signInErrors('a@b.co', 'x'))).toBe(false);
  });

  it('checks every sign-up field', () => {
    const valid = { fullName: 'Nam', email: 'nam@example.com', password: '12345678', confirm: '12345678', acceptedTerms: true };
    expect(hasErrors(signUpErrors(valid))).toBe(false);
    expect(signUpErrors({ fullName: ' ', email: 'x', password: 'short', confirm: 'other', acceptedTerms: false })).toEqual({
      fullName: 'full_name_required',
      email: 'email_invalid',
      password: 'password_too_short',
      confirm: 'confirm_mismatch',
      terms: 'terms_required',
    });
  });

  it('checks the display name', () => {
    expect(displayNameError('  ')).toBe('full_name_required');
    expect(displayNameError('x'.repeat(61))).toBe('full_name_too_long');
    expect(displayNameError(' Nguyễn Văn Nam ')).toBeUndefined();
  });

  it('checks a password change', () => {
    expect(passwordChangeErrors({ current: '', password: 'short', confirm: 'x' })).toEqual({
      current: 'password_required',
      password: 'password_too_short',
      confirm: 'confirm_mismatch',
    });
    expect(passwordChangeErrors({ current: '12345678', password: '12345678', confirm: '12345678' }).password).toBe('same_password');
    expect(hasErrors(passwordChangeErrors({ current: 'old-pass1', password: 'new-pass1', confirm: 'new-pass1' }))).toBe(false);
  });

  it('builds avatar initials', () => {
    expect(initials('Nguyễn Văn Nam', 'a@b.co')).toBe('NN');
    expect(initials('  ánh ', 'a@b.co')).toBe('Á');
    expect(initials(null, 'minh@example.com')).toBe('M');
  });
});
