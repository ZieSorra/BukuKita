import { isSupabaseConfigured, supabase } from '../supabase.js';

const validRoles = new Set(['admin', 'petugas', 'guru', 'siswa']);
const operationalRoles = new Set(['admin', 'petugas']);
const ongoingBorrowingStatuses = ['active', 'partially_returned', 'overdue'];

async function countRows(table, configure = () => {}, columns = '*') {
  const { count, error } = await configure(supabase.from(table).select(columns, { count: 'exact', head: true }));

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getOperationalSummary() {
  const currentTime = new Date().toISOString();
  const [activeBooks, availableCopies, borrowedCopies, ongoingBorrowings, overdueBorrowings, activeMembers] = await Promise.all([
    countRows('books', (query) => query.eq('status', 'active')),
    countRows('book_copies', (query) => query.eq('status', 'available')),
    countRows('book_copies', (query) => query.eq('status', 'borrowed')),
    countRows('borrowings', (query) => query.in('status', ongoingBorrowingStatuses)),
    countRows('borrowings', (query) => query.in('status', ongoingBorrowingStatuses).lt('due_at', currentTime)),
    countRows('members', (query) => query.eq('status', 'active')),
  ]);

  return {
    activeBooks,
    availableCopies,
    borrowedCopies,
    ongoingBorrowings,
    overdueBorrowings,
    activeMembers,
  };
}

async function getPersonalSummary(profile) {
  const currentTime = new Date().toISOString();
  const [myActiveBorrowings, myOverdueBorrowings, myTotalBorrowings, myBorrowedItems] = await Promise.all([
    countRows(
      'borrowings',
      (query) => query.in('status', ongoingBorrowingStatuses).eq('members.profile_id', profile.id),
      '*, members!inner(profile_id)',
    ),
    countRows(
      'borrowings',
      (query) => query.in('status', ongoingBorrowingStatuses).lt('due_at', currentTime).eq('members.profile_id', profile.id),
      '*, members!inner(profile_id)',
    ),
    countRows(
      'borrowings',
      (query) => query.neq('status', 'cancelled').eq('members.profile_id', profile.id),
      '*, members!inner(profile_id)',
    ),
    countRows(
      'borrowing_items',
      (query) => query.eq('status', 'borrowed').eq('borrowings.members.profile_id', profile.id),
      '*, borrowings!inner(member_id, members!inner(profile_id))',
    ),
  ]);

  return {
    myActiveBorrowings,
    myOverdueBorrowings,
    myTotalBorrowings,
    myBorrowedItems,
  };
}

export async function getDashboardSummary(profile) {
  if (!isSupabaseConfigured || !supabase) {
    return { summary: null, error: new Error('Supabase belum dikonfigurasi.') };
  }

  if (!profile || !profile.id || profile.status !== 'active' || !validRoles.has(profile.role)) {
    return { summary: null, error: new Error('Profile user tidak valid untuk Dashboard.') };
  }

  try {
    const summary = operationalRoles.has(profile.role)
      ? await getOperationalSummary()
      : await getPersonalSummary(profile);

    return { summary, error: null };
  } catch (error) {
    return { summary: null, error };
  }
}
