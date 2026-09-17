import { isSupabaseConfigured, supabase } from '../supabase.js';

const COPY_COLUMNS = [
  'id',
  'book_id',
  'copy_code',
  'location',
  'condition',
  'status',
  'created_at',
  'updated_at',
].join(', ');

const COPY_CONDITIONS = new Set(['good', 'fair', 'damaged']);
const COPY_STATUSES = new Set(['available', 'damaged', 'lost', 'inactive']);

function unavailable(message) {
  return { data: null, error: new Error(message) };
}

function validateClient() {
  return isSupabaseConfigured && supabase
    ? null
    : unavailable('Supabase belum dikonfigurasi.');
}

function normalizeNullableText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeCreatePayload(payload = {}) {
  const copyCode = typeof payload.copy_code === 'string' ? payload.copy_code.trim() : '';
  if (!payload.book_id) return unavailable('book_id wajib diisi.');
  if (!copyCode) return unavailable('copy_code wajib diisi.');

  const result = { book_id: payload.book_id, copy_code: copyCode };
  if (Object.hasOwn(payload, 'location')) result.location = normalizeNullableText(payload.location);
  if (Object.hasOwn(payload, 'condition')) {
    if (!COPY_CONDITIONS.has(payload.condition)) return unavailable('Condition copy harus good, fair, atau damaged.');
    result.condition = payload.condition;
  }
  if (Object.hasOwn(payload, 'status')) {
    if (!COPY_STATUSES.has(payload.status)) {
      return unavailable('Status copy harus available, damaged, lost, atau inactive.');
    }
    result.status = payload.status;
  }
  return { data: result, error: null };
}

function normalizeUpdatePayload(payload = {}) {
  const result = {};
  if (Object.hasOwn(payload, 'copy_code')) {
    const copyCode = typeof payload.copy_code === 'string' ? payload.copy_code.trim() : '';
    if (!copyCode) return unavailable('copy_code wajib diisi.');
    result.copy_code = copyCode;
  }
  if (Object.hasOwn(payload, 'location')) result.location = normalizeNullableText(payload.location);
  if (Object.hasOwn(payload, 'condition')) {
    if (!COPY_CONDITIONS.has(payload.condition)) return unavailable('Condition copy harus good, fair, atau damaged.');
    result.condition = payload.condition;
  }
  if (Object.hasOwn(payload, 'status')) {
    if (!COPY_STATUSES.has(payload.status)) {
      return unavailable('Status copy harus available, damaged, lost, atau inactive.');
    }
    result.status = payload.status;
  }
  return { data: result, error: null };
}

export async function listBookCopies(bookId) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!bookId) return unavailable('bookId wajib diisi.');

  try {
    const { data, error } = await supabase
      .from('book_copies')
      .select(COPY_COLUMNS)
      .eq('book_id', bookId)
      .order('copy_code', { ascending: true })
      .order('id', { ascending: true });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createBookCopy(payload = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;
  const normalized = normalizeCreatePayload(payload);
  if (normalized.error) return normalized;

  try {
    const { data, error } = await supabase
      .from('book_copies')
      .insert(normalized.data)
      .select(COPY_COLUMNS)
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateBookCopy(copyId, payload = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!copyId) return unavailable('copyId wajib diisi.');
  const normalized = normalizeUpdatePayload(payload);
  if (normalized.error) return normalized;
  if (!Object.keys(normalized.data).length) return unavailable('Tidak ada data copy yang akan diperbarui.');

  try {
    const { data, error } = await supabase
      .from('book_copies')
      .update(normalized.data)
      .eq('id', copyId)
      .select(COPY_COLUMNS)
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
