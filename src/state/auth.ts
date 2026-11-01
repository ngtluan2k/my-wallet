import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/data/supabaseClient';

const REMEMBER_EMAIL_KEY = 'remember_email';

interface AuthState {
  user: any | null;
  loading: boolean;
  rememberEmail: string | null;
  signUp(email: string, password: string): Promise<{ error: any }>;
  signIn(email: string, password: string): Promise<{ error: any }>;
  signOut(): Promise<void>;
  load(): Promise<void>;
  setRememberEmail(email: string): Promise<void>;
  clearRememberEmail(): Promise<void>;
  loadRememberEmail(): Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  loading: false,
  rememberEmail: null,
  async load() {
    console.log('[Auth] Loading session...');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Auth] Get session error:', error);
        set({ user: null, loading: false });
        return;
      }
      const user = data.session?.user ?? null;
      console.log('[Auth] Current user:', user?.email ?? 'null');
      console.log('[Auth] Session data:', data.session ? 'has session' : 'no session');
      set({ user, loading: false });
      
      supabase.auth.onAuthStateChange((_event, session) => {
        const newUser = session?.user ?? null;
        console.log('[Auth] Auth state changed, user:', newUser?.email ?? 'null');
        set({ user: newUser });
      });
    } catch (error) {
      console.error('[Auth] Load error:', error);
      set({ user: null, loading: false });
    }
  },
  async signUp(email, password) {
    console.log('[Auth] Signing up with email:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[Auth] Sign up error:', error);
    } else {
      console.log('[Auth] Sign up success:', data);
    }
    return { error };
  },
  async signIn(email, password) {
    console.log('[Auth] Signing in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] Sign in error:', error);
    } else {
      console.log('[Auth] Sign in success:', data);
    }
    return { error };
  },
  async signOut() {
    console.log('[Auth] Signing out...');
    try {
      // Clear Supabase session
      await supabase.auth.signOut();
      // Clear any stored sessions from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.includes('sb-ngfpfbzzwoptpoteaond-auth') || k.includes('supabase'));
      if (sessionKeys.length > 0) {
        await AsyncStorage.multiRemove(sessionKeys);
        console.log('[Auth] Cleared session keys:', sessionKeys);
      }
      // Clear remember email
      try {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {
        // Ignore storage errors
      }
      // Reset state
      set({ user: null, loading: false, rememberEmail: null });
      console.log('[Auth] Sign out complete');
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      // Still reset state even if cleanup fails
      set({ user: null, loading: false, rememberEmail: null });
    }
  },
  async setRememberEmail(email) {
    try {
      await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email);
      set({ rememberEmail: email });
    } catch {
      // Ignore storage errors
    }
  },
  async clearRememberEmail() {
    try {
      await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      set({ rememberEmail: null });
    } catch {
      // Ignore storage errors
    }
  },
  async loadRememberEmail() {
    try {
      const email = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
      set({ rememberEmail: email });
    } catch {
      set({ rememberEmail: null });
    }
  },
}));