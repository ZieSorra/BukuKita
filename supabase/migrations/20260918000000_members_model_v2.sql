-- BukuKita M2B: members model for students and admin members

alter table public.members
    alter column profile_id drop not null;

alter table public.students
    add column if not exists full_name text;

do $$
begin
    if exists (
        select 1
        from public.students
        where full_name is null
    ) then
        raise exception 'Migration M2B dihentikan: students.full_name memiliki nilai NULL';
    end if;
end;
$$;

alter table public.students
    alter column full_name set not null;

alter table public.members
    drop constraint if exists members_member_type_check;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.members'::regclass
          and conname = 'members_member_type_check_v2'
    ) then
        alter table public.members
            add constraint members_member_type_check_v2
            check (member_type in ('siswa', 'admin'));
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.members'::regclass
          and conname = 'members_student_profile_null_check'
    ) then
        alter table public.members
            add constraint members_student_profile_null_check
            check (member_type <> 'siswa' or profile_id is null);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.members'::regclass
          and conname = 'members_admin_profile_required_check'
    ) then
        alter table public.members
            add constraint members_admin_profile_required_check
            check (member_type <> 'admin' or profile_id is not null);
    end if;
end;
$$;

create sequence if not exists public.student_member_code_seq;
create sequence if not exists public.admin_member_code_seq;

revoke all on sequence public.student_member_code_seq from public;
revoke all on sequence public.admin_member_code_seq from public;

create index if not exists members_member_type_idx
    on public.members (member_type);

create index if not exists members_status_idx
    on public.members (status);

create or replace function public.validate_member_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
    profile_role text;
begin
    if new.member_type = 'admin' then
        if exists (
            select 1
            from public.students as s
            where s.member_id = new.id
        ) then
            raise exception 'Member admin tidak boleh memiliki record students';
        end if;

        select p.role
        into profile_role
        from public.profiles as p
        where p.id = new.profile_id;

        if profile_role is distinct from 'admin' then
            raise exception 'Admin member harus terkait profile dengan role admin';
        end if;
    elsif new.member_type = 'siswa' then
        if not exists (
            select 1
            from public.students as s
            where s.member_id = new.id
        ) then
            raise exception 'Member siswa wajib memiliki record students';
        end if;
    end if;

    return new;
end;
$$;

create or replace function public.validate_student_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
    member_type_value text;
begin
    if tg_op <> 'DELETE' then
        select m.member_type
        into member_type_value
        from public.members as m
        where m.id = new.member_id;

        if member_type_value is distinct from 'siswa' then
            raise exception 'Student harus terkait member dengan member_type siswa';
        end if;
    end if;

    if tg_op <> 'INSERT' then
        select m.member_type
        into member_type_value
        from public.members as m
        where m.id = old.member_id;

        if member_type_value = 'siswa'
           and not exists (
               select 1
               from public.students as s
               where s.member_id = old.member_id
           ) then
            raise exception 'Member siswa wajib memiliki record students';
        end if;
    end if;

    return coalesce(new, old);
end;
$$;

create or replace function public.validate_admin_profile_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if (new.role is distinct from 'admin' or new.status is distinct from 'active')
       and exists (
           select 1
           from public.members as m
           where m.profile_id = new.id
             and m.member_type = 'admin'
       ) then
        raise exception 'Profile admin tidak dapat menjadi nonaktif atau non-admin selama menjadi member admin';
    end if;

    return new;
end;
$$;

drop trigger if exists members_validate_integrity on public.members;
create constraint trigger members_validate_integrity
after insert or update on public.members
deferrable initially deferred
for each row execute function public.validate_member_integrity();

drop trigger if exists students_validate_integrity on public.students;
create constraint trigger students_validate_integrity
after insert or update or delete on public.students
deferrable initially deferred
for each row execute function public.validate_student_integrity();

drop trigger if exists profiles_validate_admin_integrity on public.profiles;
create constraint trigger profiles_validate_admin_integrity
after update of role, status on public.profiles
deferrable initially deferred
for each row execute function public.validate_admin_profile_integrity();

create or replace function public.next_student_member_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
    if public.current_user_role() not in ('admin', 'petugas') then
        raise exception 'Hanya Admin atau Petugas yang dapat menghasilkan kode member siswa';
    end if;

    return 'S-' || lpad(nextval('public.student_member_code_seq')::text, 4, '0');
end;
$$;

create or replace function public.next_admin_member_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
    if public.current_user_role() not in ('admin', 'petugas') then
        raise exception 'Hanya Admin atau Petugas yang dapat menghasilkan kode member admin';
    end if;

    return 'A-' || lpad(nextval('public.admin_member_code_seq')::text, 4, '0');
end;
$$;

create or replace function public.create_student_member(
    p_full_name text,
    p_nis text,
    p_class_name text default null,
    p_academic_year_id uuid default null,
    p_joined_at date default current_date
)
returns table (member_id uuid, member_code text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
    new_member_id uuid;
    new_member_code text;
begin
    if public.current_user_role() not in ('admin', 'petugas') then
        raise exception 'Hanya Admin atau Petugas yang dapat membuat member siswa';
    end if;

    if nullif(trim(p_full_name), '') is null then
        raise exception 'Nama siswa wajib diisi';
    end if;

    if nullif(trim(p_nis), '') is null then
        raise exception 'NIS wajib diisi';
    end if;

    new_member_code := public.next_student_member_code();

    insert into public.members (profile_id, member_code, member_type, joined_at)
    values (null, new_member_code, 'siswa', p_joined_at)
    returning id into new_member_id;

    insert into public.students (member_id, full_name, nis, class_name, academic_year_id)
    values (new_member_id, trim(p_full_name), trim(p_nis), nullif(trim(p_class_name), ''), p_academic_year_id);

    return query select new_member_id, new_member_code;
end;
$$;

create or replace function public.create_admin_member(
    p_profile_id uuid,
    p_joined_at date default current_date
)
returns table (member_id uuid, member_code text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
    new_member_id uuid;
    new_member_code text;
    profile_role text;
    profile_status text;
begin
    if public.current_user_role() not in ('admin', 'petugas') then
        raise exception 'Hanya Admin atau Petugas yang dapat membuat member admin';
    end if;

    select p.role, p.status
    into profile_role, profile_status
    from public.profiles as p
    where p.id = p_profile_id;

    if profile_role is null then
        raise exception 'Profile admin tidak ditemukan';
    end if;

    if profile_role <> 'admin' then
        raise exception 'Profile member harus memiliki role admin';
    end if;

    if profile_status <> 'active' then
        raise exception 'Profile admin harus aktif';
    end if;

    if exists (select 1 from public.members where profile_id = p_profile_id) then
        raise exception 'Profile sudah memiliki member';
    end if;

    new_member_code := public.next_admin_member_code();

    insert into public.members (profile_id, member_code, member_type, joined_at)
    values (p_profile_id, new_member_code, 'admin', p_joined_at)
    returning id into new_member_id;

    return query select new_member_id, new_member_code;
end;
$$;

revoke all on function public.create_student_member(text, text, text, uuid, date) from public;
grant execute on function public.create_student_member(text, text, text, uuid, date) to authenticated;

revoke all on function public.create_admin_member(uuid, date) from public;
grant execute on function public.create_admin_member(uuid, date) to authenticated;

revoke all on function public.next_student_member_code() from public;
grant execute on function public.next_student_member_code() to authenticated;

revoke all on function public.next_admin_member_code() from public;
grant execute on function public.next_admin_member_code() to authenticated;

drop policy if exists members_select_staff_or_own on public.members;
drop policy if exists members_select_staff on public.members;
create policy members_select_staff
on public.members
for select
to authenticated
using (public.current_user_role() in ('admin', 'petugas'));

drop policy if exists students_select_staff_or_teacher_or_own on public.students;
drop policy if exists students_select_staff on public.students;
create policy students_select_staff
on public.students
for select
to authenticated
using (public.current_user_role() in ('admin', 'petugas'));