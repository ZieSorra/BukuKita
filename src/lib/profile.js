import { supabase, isSupabaseConfigured } from './supabase.js';

export async function getCurrentProfile() {
  if (!isSupabaseConfigured || !supabase) {
    return { profile: null, error: new Error('Supabase belum dikonfigurasi.') };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return { profile: null, error: userError ?? new Error('User aktif tidak ditemukan.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return { profile: null, error };
  }

  if (!data) {
    return { profile: null, error: new Error('Profile user belum ditemukan.') };
  }

  if (data.status !== 'active') {
    return { profile: null, error: new Error('Profile user tidak aktif.') };
  }

  return { profile: data, error: null };
}