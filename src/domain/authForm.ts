export const MIN_PASSWORD_LENGTH = 8;

export type AuthFieldError =
  | 'email_required'
  | 'email_invalid'
  | 'password_required'
  | 'password_too_short'
  | 'confirm_mismatch'
  | 'full_name_required'
  | 'terms_required';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailError(email: string): AuthFieldError | undefined {
  const value = normalizeEmail(email);
  if (!value) return 'email_required';
  if (!EMAIL.test(value)) return 'email_invalid';
  return undefined;
}

/** Sign-in only checks presence; length rules apply when choosing a password. */
export function signInErrors(email: string, password: string) {
  return { email: emailError(email), password: password ? undefined : ('password_required' as const) };
}

export function signUpErrors(input: {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
  acceptedTerms: boolean;
}) {
  return {
    fullName: input.fullName.trim() ? undefined : ('full_name_required' as const),
    email: emailError(input.email),
    password: !input.password
      ? ('password_required' as const)
      : input.password.length < MIN_PASSWORD_LENGTH
        ? ('password_too_short' as const)
        : undefined,
    confirm: input.confirm !== input.password ? ('confirm_mismatch' as const) : undefined,
    terms: input.acceptedTerms ? undefined : ('terms_required' as const),
  };
}

export function hasErrors(errors: Record<string, AuthFieldError | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
