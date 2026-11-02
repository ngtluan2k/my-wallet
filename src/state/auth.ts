import type { AuthError, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/data/supabaseClient';

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
  return 'unknown';
}

/** The name entered at sign-up (or edited on the profile screen), if any. */
export function displayName(user: User | null | undefined): string | null {
  const value = user?.user_metadata?.full_name;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

interface AuthState {
  /** Undefined until the stored session has been read. */
  user: User | null | undefined;
  load(): Promise<void>;
  signIn(email: string, password: string): Promise<AuthErrorCode | null>;
  /** Returns 'confirm' when the account needs email confirmation before signing in. */
  signUp(email: string, password: string, fullName: string): Promise<AuthErrorCode | 'confirm' | null>;
  resetPassword(email: string): Promise<AuthErrorCode | null>;
  updateDisplayName(name: string): Promise<AuthErrorCode | null>;
  /** Checks the current password first, so a borrowed unlocked phone can't take over the account. */
  changePassword(current: string, next: string): Promise<AuthErrorCode | null>;
  /** Ends the session. Wallet data stays on the device, keyed by user, for the next sign-in. */
  signOut(): Promise<void>;
}

let subscribed = false;

export const useAuth = create<AuthState>()((set, get) => ({
  user: undefined,

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
        options: { data: { full_name: fullName } },
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
      const { error } = await supabase.auth.resetPasswordForEmail(email);
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

  async changePassword(current, next) {
    const email = get().user?.email;
    if (!email) return 'unknown';
    try {
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) {
        const code = authErrorCode(check.error);
        return code === 'invalid_credentials' ? 'wrong_current_password' : code;
      }
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
      set({ user: null });
    }
  },
}));
