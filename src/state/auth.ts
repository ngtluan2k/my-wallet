import { create } from 'zustand';
import { supabase } from '@/data/supabaseClient';

interface AuthState {
  user: any | null;
  loading: boolean;
  signUp(email: string, password: string): Promise<{ error: any }>;
  signIn(email: string, password: string): Promise<{ error: any }>;
  signOut(): Promise<void>;
  load(): Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  loading: true,
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
}));