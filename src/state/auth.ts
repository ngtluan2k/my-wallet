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
  loading: true,
  rememberEmail: null,
  async load() {
    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
    });
  },
  async signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  },
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  },
  async signOut() {
    await supabase.auth.signOut();
    set({ user: null });
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