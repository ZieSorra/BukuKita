import { isSupabaseConfigured, supabase } from '../supabase.js';

const BOOK_COLUMNS = [
  'id',
  'isbn',
  'title',
  'author',
  'publisher',
  'publication_year',
  'category_id',
  'description',
  'cover_url',
  'status',
  'created_at',
  'updated_at',
].join(', ');

const BOOK_COLUMNS_WITH_CATEGORY = `${BOOK_COLUMNS}, category:book_categories(id, name, status)`;
const BOOK_STATUSES = new Set(['active', 'inactive']);

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

function normalizeBookPayload(payload = {}, partial = false) {
  const result = {};

  if (!partial || Object.hasOwn(payload, 'title')) {
    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    if (!title) return unavailable('Title buku wajib diisi.');
    result.title = title;
  }

  for (const field of ['isbn', 'author', 'publisher', 'description', 'cover_url']) {
    if (Object.hasOwn(payload, field)) result[field] = normalizeNullableText(payload[field]);
  }

  if (Object.hasOwn(payload, 'publication_year')) {
    if (payload.publication_year === '' || payload.publication_year === null) {
      result.publication_year = null;
    } else if (Number.isInteger(payload.publication_year)) {
      result.publication_year = payload.publication_year;
    } else {
      return unavailable('publication_year harus berupa bilangan bulat atau kosong.');
    }
  }

  if (Object.hasOwn(payload, 'category_id')) result.category_id = payload.category_id || null;

  if (Object.hasOwn(payload, 'status')) {
    if (!BOOK_STATUSES.has(payload.status)) {
      return unavailable('Status buku harus active atau inactive.');
    }
    result.status = payload.status;
  }

  return { data: result, error: null };
}

function escapeSearchTerm(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll(',', ' ')
    .replaceAll('(', ' ')
    .replaceAll(')', ' ')
    .trim();
}

export async function listBooks({
  page = 1,
  pageSize = 20,
  search = '',
  categoryId = null,
  status = null,
  includeCategory = false,
} = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!Number.isInteger(page) || page < 1) return unavailable('Page harus berupa bilangan bulat positif.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return unavailable('pageSize harus berada di antara 1 dan 100.');
  }
  if (status !== null && !BOOK_STATUSES.has(status)) {
    return unavailable('Status buku harus active atau inactive.');
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('books')
      .select(includeCategory ? BOOK_COLUMNS_WITH_CATEGORY : BOOK_COLUMNS, { count: 'exact' })
      .order('title', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    const normalizedSearch = escapeSearchTerm(search);
    if (normalizedSearch) {
      const pattern = `%${normalizedSearch}%`;
      query = query.or(
        `title.ilike.${pattern},author.ilike.${pattern},publisher.ilike.${pattern},isbn.ilike.${pattern}`,
      );
    }
    if (categoryId) query = query.eq('category_id', categoryId);
    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    return {
      data: error ? null : { items: data ?? [], total: count ?? 0, page, pageSize },
      error,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getBookById(bookId, { includeCategory = false } = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!bookId) return unavailable('bookId wajib diisi.');

  try {
    const { data, error } = await supabase
      .from('books')
      .select(includeCategory ? BOOK_COLUMNS_WITH_CATEGORY : BOOK_COLUMNS)
      .eq('id', bookId)
      .maybeSingle();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createBook(payload = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;
  const normalized = normalizeBookPayload(payload);
  if (normalized.error) return normalized;

  try {
    const { data, error } = await supabase
      .from('books')
      .insert(normalized.data)
      .select(BOOK_COLUMNS)
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateBook(bookId, payload = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!bookId) return unavailable('bookId wajib diisi.');
  const normalized = normalizeBookPayload(payload, true);
  if (normalized.error) return normalized;
  if (!Object.keys(normalized.data).length) return unavailable('Tidak ada data buku yang akan diperbarui.');

  try {
    const { data, error } = await supabase
      .from('books')
      .update(normalized.data)
      .eq('id', bookId)
      .select(BOOK_COLUMNS)
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateBookStatus(bookId, status) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!bookId) return unavailable('bookId wajib diisi.');
  if (!BOOK_STATUSES.has(status)) return unavailable('Status buku harus active atau inactive.');

  try {
    const { data, error } = await supabase
      .from('books')
      .update({ status })
      .eq('id', bookId)
      .select(BOOK_COLUMNS)
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
