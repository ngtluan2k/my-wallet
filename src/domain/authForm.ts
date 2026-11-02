export const MIN_PASSWORD_LENGTH = 8;

export type AuthFieldError =
  | 'email_required'
  | 'email_invalid'
  | 'password_required'
  | 'password_too_short'
  | 'confirm_mismatch'
  | 'full_name_required'
  | 'terms_required'
  | 'same_password';

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

export const MAX_DISPLAY_NAME_LENGTH = 60;

export type ProfileFieldError = 'full_name_required' | 'full_name_too_long';

export function displayNameError(name: string): ProfileFieldError | undefined {
  const value = name.trim();
  if (!value) return 'full_name_required';
  if (value.length > MAX_DISPLAY_NAME_LENGTH) return 'full_name_too_long';
  return undefined;
}

/** Changing the password asks for the current one first, then the new one twice. */
export function passwordChangeErrors(input: { current: string; password: string; confirm: string }) {
  return {
    current: input.current ? undefined : ('password_required' as const),
    password: !input.password
      ? ('password_required' as const)
      : input.password.length < MIN_PASSWORD_LENGTH
        ? ('password_too_short' as const)
        : input.password === input.current
          ? ('same_password' as const)
          : undefined,
    confirm: input.confirm !== input.password ? ('confirm_mismatch' as const) : undefined,
  };
}

/** Initials for the profile avatar: first letters of the first and last words. */
export function initials(name: string | null | undefined, fallback: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const source = words.length > 0 ? [words[0], words.length > 1 ? words[words.length - 1] : ''] : [fallback];
  return source
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}
