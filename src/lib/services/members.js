import { isSupabaseConfigured, supabase } from '../supabase.js';

const MEMBER_TYPES = new Set(['siswa', 'admin']);
const MEMBER_STATUSES = new Set(['active', 'inactive']);
const MEMBER_COLUMNS = [
  'id',
  'profile_id',
  'member_code',
  'member_type',
  'status',
  'joined_at',
  'created_at',
  'updated_at',
  'profile:profiles(id, full_name, role, status)',
  'student:students(member_id, full_name, nis, class_name, academic_year:academic_years(id, name))',
].join(', ');

function unavailable(message) {
  return { data: null, error: new Error(message) };
}

function validateClient() {
  return isSupabaseConfigured && supabase
    ? null
    : unavailable('Supabase belum dikonfigurasi.');
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

function quoteInValues(values) {
  return values.map((value) => String(value).replaceAll(',', ' ')).join(',');
}

async function findSearchIds(search) {
  const pattern = `%${escapeSearchTerm(search)}%`;
  const [
    { data: profiles, error: profilesError },
    { data: studentsByName, error: studentsByNameError },
    { data: studentsByNis, error: studentsByNisError },
  ] = await Promise.all([
    supabase.from('profiles').select('id').ilike('full_name', pattern),
    supabase.from('students').select('member_id').ilike('full_name', pattern),
    supabase.from('students').select('member_id').ilike('nis', pattern),
  ]);

  if (profilesError) throw profilesError;
  if (studentsByNameError) throw studentsByNameError;
  if (studentsByNisError) throw studentsByNisError;

  return {
    profileIds: (profiles ?? []).map(({ id }) => id),
    memberIds: [...new Set([...(studentsByName ?? []), ...(studentsByNis ?? [])]
      .map(({ member_id: memberId }) => memberId)
      .filter(Boolean))],
  };
}

export async function listAdminProfiles() {
  const clientError = validateClient();
  if (clientError) return clientError;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, status, members!left(profile_id)')
      .eq('role', 'admin')
      .eq('status', 'active')
      .is('members', null)
      .order('full_name', { ascending: true })
      .order('id', { ascending: true });

    return {
      data: error
        ? null
        : (data ?? []).map(({ id, full_name: fullName, role, status }) => ({
          id,
          full_name: fullName,
          role,
          status,
        })),
      error,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function listMembers({
  page = 1,
  pageSize = 20,
  search = '',
  memberType = null,
  status = null,
} = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!Number.isInteger(page) || page < 1) return unavailable('Page harus berupa bilangan bulat positif.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return unavailable('pageSize harus berada di antara 1 dan 100.');
  }
  if (memberType !== null && !MEMBER_TYPES.has(memberType)) {
    return unavailable('Jenis anggota tidak valid.');
  }
  if (status !== null && !MEMBER_STATUSES.has(status)) {
    return unavailable('Status anggota harus active atau inactive.');
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('members')
      .select(MEMBER_COLUMNS, { count: 'exact' })
      .order('member_code', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      const { profileIds, memberIds } = await findSearchIds(normalizedSearch);
      const searchTerm = escapeSearchTerm(normalizedSearch);
      const searchClauses = [`member_code.ilike.%${searchTerm}%`];
      if (profileIds.length) searchClauses.push(`profile_id.in.(${quoteInValues(profileIds)})`);
      if (memberIds.length) searchClauses.push(`id.in.(${quoteInValues(memberIds)})`);
      query = query.or(searchClauses.join(','));
    }
    if (memberType) query = query.eq('member_type', memberType);
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

export async function createStudentMember({
  fullName,
  nis,
  className = null,
  academicYearId = null,
  joinedAt = null,
} = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;

  try {
    const { data, error } = await supabase.rpc('create_student_member', {
      p_full_name: fullName,
      p_nis: nis,
      p_class_name: className,
      p_academic_year_id: academicYearId,
      p_joined_at: joinedAt,
    });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createAdminMember({ profileId, joinedAt = null } = {}) {
  const clientError = validateClient();
  if (clientError) return clientError;

  try {
    const { data, error } = await supabase.rpc('create_admin_member', {
      p_profile_id: profileId,
      p_joined_at: joinedAt,
    });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMemberById(memberId) {
  const clientError = validateClient();
  if (clientError) return clientError;
  if (!memberId) return unavailable('memberId wajib diisi.');

  try {
    const { data, error } = await supabase
      .from('members')
      .select(MEMBER_COLUMNS)
      .eq('id', memberId)
      .maybeSingle();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}