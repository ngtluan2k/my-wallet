import { emailError, hasErrors, normalizeEmail, signInErrors, signUpErrors } from '../authForm';

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
});
