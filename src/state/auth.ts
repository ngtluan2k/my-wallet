import { FunctionsFetchError, type AuthError, type User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { create } from 'zustand';

import { supabase } from '@/data/supabaseClient';
import { parseAuthCallback } from '@/domain/authLink';

/** Error codes the auth screens translate. */
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_taken'
  | 'weak_password'
  | 'same_password'
  | 'wrong_current_password'
  | 'reauthentication_needed'
  | 'rate_limited'
  | 'link_invalid'
  | 'server_error'
  | 'delete_failed'
  | 'network'
  | 'unknown';

export function authErrorCode(error: AuthError | Error | null | undefined): AuthErrorCode | null {
  if (!error) return null;
  const code = 'code' in error ? (error.code as string | undefined) : undefined;
  const message = error.message?.toLowerCase() ?? '';
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'invalid_credentials';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'email_not_confirmed';
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) return 'email_taken';
  if (code === 'same_password') return 'same_password';
  if (code === 'reauthentication_needed' || code === 'reauth_nonce_missing') return 'reauthentication_needed';
  if (code === 'weak_password' || message.includes('password should be')) return 'weak_password';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'rate_limited';
  }
  if (message.includes('network') || message.includes('fetch')) return 'network';
  // e.g. "Database error saving new user": a problem in the Supabase project, not in what the user typed.
  const status = 'status' in error ? (error.status as number | undefined) : undefined;
  if (code === 'unexpected_failure' || message.includes('database error') || (status !== undefined && status >= 500)) {
    if (__DEV__) console.warn('[auth] server error', status, code, error.message);
    return 'server_error';
  }
  if (__DEV__) console.warn('[auth] unmapped error', status, code, error.message);
  return 'unknown';
}

/**
 * Where email links send the user back to: `mywallet://auth-callback?flow=…` in builds, the
 * `exp://…/--/auth-callback` equivalent in Expo Go. Both must be listed in Supabase's Redirect URLs.
 */
export function authRedirectUrl(flow: 'confirm' | 'recovery'): string {
  return Linking.createURL('auth-callback', { queryParams: { flow } });
}

/** The name entered at sign-up (or edited on the profile screen), if any. */
export function displayName(user: User | null | undefined): string | null {
  const value = user?.user_metadata?.full_name;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

interface AuthState {
  /** Undefined until the stored session has been read. */
  user: User | null | undefined;
  /** True after opening a password-reset link: the app asks for a new password before anything else. */
  recovering: boolean;
  /** True while an email link is being exchanged for a session. */
  handlingLink: boolean;
  /** Set when an email link was expired or invalid; shown on the sign-in screen. */
  linkError: AuthErrorCode | null;
  load(): Promise<void>;
  signIn(email: string, password: string): Promise<AuthErrorCode | null>;
  /** Returns 'confirm' when the account needs email confirmation before signing in. */
  signUp(email: string, password: string, fullName: string): Promise<AuthErrorCode | 'confirm' | null>;
  resetPassword(email: string): Promise<AuthErrorCode | null>;
  updateDisplayName(name: string): Promise<AuthErrorCode | null>;
  /** Finishes a password reset: sets the new password and lets the user into the app. */
  setNewPassword(password: string): Promise<AuthErrorCode | null>;
  /** Re-checks the signed-in user's password (before sensitive actions). */
  verifyPassword(password: string): Promise<AuthErrorCode | null>;
  /** Deletes the account and all its synced data on the server (Edge Function `delete-account`). */
  deleteRemoteAccount(): Promise<AuthErrorCode | null>;
  clearLinkError(): void;
  /** Checks the current password first, so a borrowed unlocked phone can't take over the account. */
  changePassword(current: string, next: string): Promise<AuthErrorCode | null>;
  /** Ends the session. Wallet data stays on the device, keyed by user, for the next sign-in. */
  signOut(): Promise<void>;
}

let subscribed = false;
let linkSubscribed = false;

/** Turns a confirmation or password-reset link into a session. Other deep links are ignored. */
async function handleAuthLink(url: string) {
  const link = parseAuthCallback(url);
  if (!link) return;
  const set = useAuth.setState;
  if (link.error) {
    set({ linkError: 'link_invalid' });
    return;
  }
  set({ handlingLink: true, linkError: null });
  try {
    const { error } = link.code
      ? await supabase.auth.exchangeCodeForSession(link.code)
      : await supabase.auth.setSession({ access_token: link.accessToken!, refresh_token: link.refreshToken! });
    if (error) {
      set({ linkError: 'link_invalid' });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, recovering: link.flow === 'recovery' && !!data.session });
  } catch {
    set({ linkError: 'network' });
  } finally {
    set({ handlingLink: false });
  }
}

export const useAuth = create<AuthState>()((set, get) => ({
  user: undefined,
  recovering: false,
  handlingLink: false,
  linkError: null,

  async load() {
    if (!subscribed) {
      subscribed = true;
      supabase.auth.onAuthStateChange((event, session) => {
        const next = session?.user ?? null;
        // Token refreshes emit the same user; keep the reference stable so listeners don't reload.
        // Profile edits (USER_UPDATED) keep the id, so the session isn't reopened either.
        if (event === 'USER_UPDATED' || next?.id !== useAuth.getState().user?.id) set({ user: next });
      });
    }
    try {
      const { data } = await supabase.auth.getSession();
      set({ user: data.session?.user ?? null });
    } catch {
      set({ user: null });
    }
    if (!linkSubscribed) {
      linkSubscribed = true;
      Linking.addEventListener('url', ({ url }) => void handleAuthLink(url));
      const initial = await Linking.getInitialURL().catch(() => null);
      if (initial) await handleAuthLink(initial);
    }
  },

  async signIn(email, password) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return authErrorCode(error);
    } catch (error) {
      return authErrorCode(error as Error);
    }
  },

  async signUp(email, password, fullName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: authRedirectUrl('confirm') },
      });
      if (error) return authErrorCode(error);
      // With email confirmation on, no session is returned until the link is opened.
      return data.session ? null : 'confirm';
    } catch (error) {
      return authErrorCode(error as Error);
    }
  },

  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl('recovery') });
      return authErrorCode(error);
    } catch (error) {
      return authErrorCode(error as Error);
    }
  },

  async updateDisplayName(name) {
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      if (error) return authErrorCode(error);
      if (data.user) set({ user: data.user });
      return null;
    } catch (error) {
      return authErrorCode(error as Error);
    }
  },

  async setNewPassword(password) {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return authErrorCode(error);
      set({ recovering: false });
      return null;
    } catch (error) {
      return authErrorCode(error as Error);
    }
  },

  async verifyPassword(password) {
    const email = get().user?.email;
    if (!email) return 'unknown';
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return null;
      const code = authErrorCode(error);
      return code === 'invalid_credentials' ? 'wrong_current_password' : code;
    } catch (error) {
      return authErrorCode(error as Error);
    }
  },

  async deleteRemoteAccount() {
    try {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (!error) return null;
      return error instanceof FunctionsFetchError ? 'network' : 'delete_failed';
    } catch {
      return 'network';
    }
  },

  clearLinkError: () => set({ linkError: null }),

  async changePassword(current, next) {
    const check = await get().verifyPassword(current);
    if (check) return check;
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      return authErrorCode(error);
    } catch (error) {
      return authErrorCode(error as Error);
    }
  },

  async signOut() {
    try {
      // Local scope: only this device signs out, and it works offline.
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      set({ user: null, recovering: false });
    }
  },
}));
