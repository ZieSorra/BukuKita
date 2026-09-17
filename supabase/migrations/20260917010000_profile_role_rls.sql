-- BUKUKITA Sprint 2C: profile roles and row-level security

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select p.role
    from public.profiles as p
    where p.id = auth.uid()
      and p.status = 'active'
    limit 1;
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

create policy profiles_select_admin_or_staff_or_own
on public.profiles
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (id = auth.uid() and public.current_user_role() is not null)
);

-- The first admin profile must be created through an administrative bootstrap
-- process in the Supabase SQL Editor, not through frontend self-registration.
create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check (public.current_user_role() = 'admin');

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy members_select_staff_or_own
on public.members
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (profile_id = auth.uid() and public.current_user_role() is not null)
);

create policy members_insert_staff
on public.members
for insert
to authenticated
with check (public.current_user_role() in ('admin', 'petugas'));

create policy members_update_staff
on public.members
for update
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy members_delete_staff
on public.members
for delete
to authenticated
using (public.current_user_role() in ('admin', 'petugas'));

create policy students_select_staff_or_teacher_or_own
on public.students
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (
        public.current_user_role() = 'siswa'
        and exists (
            select 1
            from public.members as m
            where m.id = member_id
              and m.profile_id = auth.uid()
        )
    )
);

create policy students_insert_staff
on public.students
for insert
to authenticated
with check (public.current_user_role() in ('admin', 'petugas'));

create policy students_update_staff
on public.students
for update
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy students_delete_staff
on public.students
for delete
to authenticated
using (public.current_user_role() in ('admin', 'petugas'));

create policy academic_years_select_authenticated
on public.academic_years
for select
to authenticated
using (public.current_user_role() is not null);

create policy academic_years_insert_admin
on public.academic_years
for insert
to authenticated
with check (public.current_user_role() = 'admin');

create policy academic_years_update_admin
on public.academic_years
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy book_categories_select_authenticated
on public.book_categories
for select
to authenticated
using (public.current_user_role() is not null);

create policy book_categories_write_staff
on public.book_categories
for all
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy books_select_active_or_staff
on public.books
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (
        public.current_user_role() in ('guru', 'siswa')
        and status = 'active'
    )
);

create policy books_write_staff
on public.books
for all
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy book_copies_select_active_or_staff
on public.book_copies
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (
        public.current_user_role() in ('guru', 'siswa')
        and exists (
            select 1
            from public.books as b
            where b.id = book_id
              and b.status = 'active'
        )
    )
);

create policy book_copies_write_staff
on public.book_copies
for all
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy borrowings_select_staff_or_own
on public.borrowings
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (
        public.current_user_role() in ('guru', 'siswa')
        and exists (
            select 1
            from public.members as m
            where m.id = member_id
              and m.profile_id = auth.uid()
        )
    )
);

create policy borrowings_write_staff
on public.borrowings
for all
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy borrowing_items_select_staff_or_own
on public.borrowing_items
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (
        public.current_user_role() in ('guru', 'siswa')
        and exists (
            select 1
            from public.borrowings as b
            join public.members as m on m.id = b.member_id
            where b.id = borrowing_id
              and m.profile_id = auth.uid()
        )
    )
);

create policy borrowing_items_write_staff
on public.borrowing_items
for all
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy returns_select_staff_or_own
on public.returns
for select
to authenticated
using (
    public.current_user_role() in ('admin', 'petugas')
    or (
        public.current_user_role() in ('guru', 'siswa')
        and exists (
            select 1
            from public.borrowing_items as bi
            join public.borrowings as b on b.id = bi.borrowing_id
            join public.members as m on m.id = b.member_id
            where bi.id = borrowing_item_id
              and m.profile_id = auth.uid()
        )
    )
);

create policy returns_write_staff
on public.returns
for all
to authenticated
using (public.current_user_role() in ('admin', 'petugas'))
with check (public.current_user_role() in ('admin', 'petugas'));

create policy settings_select_admin_or_staff
on public.settings
for select
to authenticated
using (public.current_user_role() in ('admin', 'petugas'));

create policy settings_write_admin
on public.settings
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');