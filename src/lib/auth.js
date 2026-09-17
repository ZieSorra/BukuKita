import { supabase, isSupabaseConfigured } from './supabase.js';

export const auth = {
  isConfigured: isSupabaseConfigured,

  async getSession() {
    if (!supabase) {
      return { session: null, error: new Error('Supabase belum dikonfigurasi.') };
    }

    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session ?? null, error };
  },

  async signIn(email, password) {
    if (!supabase) {
      return { data: null, error: new Error('Supabase belum dikonfigurasi.') };
    }

    return supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    if (!supabase) {
      return { error: new Error('Supabase belum dikonfigurasi.') };
    }

    return supabase.auth.signOut();
  },

  onAuthStateChange(callback) {
    if (!supabase) {
      return { data: { subscription: { unsubscribe() {} } } };
    }

    return supabase.auth.onAuthStateChange(callback);
  },
};