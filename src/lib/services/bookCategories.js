import { isSupabaseConfigured, supabase } from '../supabase.js';

const CATEGORY_COLUMNS = [
  'id',
  'name',
  'description',
  'status',
  'created_at',
  'updated_at',
].join(', ');

function unavailable() {
  return { data: null, error: new Error('Supabase belum dikonfigurasi.') };
}

async function fetchCategories(activeOnly) {
  if (!isSupabaseConfigured || !supabase) return unavailable();

  try {
    let query = supabase
      .from('book_categories')
      .select(CATEGORY_COLUMNS)
      .order('name', { ascending: true })
      .order('id', { ascending: true });

    if (activeOnly) query = query.eq('status', 'active');

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export function listCategories() {
  return fetchCategories(false);
}

export function listActiveCategories() {
  return fetchCategories(true);
}
