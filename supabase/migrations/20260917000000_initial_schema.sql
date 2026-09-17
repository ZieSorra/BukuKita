-- BUKUKITA initial schema

create table public.profiles (
    id uuid primary key references auth.users(id),
    full_name text not null,
    role text not null check (role in ('admin', 'petugas', 'guru', 'siswa')),
    avatar_url text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.academic_years (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    start_date date,
    end_date date,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.book_categories (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    description text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.members (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid unique not null references public.profiles(id),
    member_code text unique not null,
    member_type text not null check (member_type in ('siswa', 'guru', 'petugas')),
    status text not null default 'active' check (status in ('active', 'inactive')),
    joined_at date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.students (
    id uuid primary key default gen_random_uuid(),
    member_id uuid unique not null references public.members(id),
    nis text unique not null,
    class_name text,
    academic_year_id uuid references public.academic_years(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.books (
    id uuid primary key default gen_random_uuid(),
    isbn text,
    title text not null,
    author text,
    publisher text,
    publication_year integer,
    category_id uuid references public.book_categories(id),
    description text,
    cover_url text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.book_copies (
    id uuid primary key default gen_random_uuid(),
    book_id uuid not null references public.books(id),
    copy_code text unique not null,
    location text,
    condition text not null default 'good' check (condition in ('good', 'fair', 'damaged')),
    status text not null default 'available' check (status in ('available', 'borrowed', 'damaged', 'lost', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.borrowings (
    id uuid primary key default gen_random_uuid(),
    borrowing_code text unique not null,
    member_id uuid not null references public.members(id),
    borrowed_at timestamptz not null,
    due_at timestamptz not null,
    status text not null default 'active' check (status in ('active', 'partially_returned', 'completed', 'overdue', 'cancelled')),
    processed_by uuid references public.profiles(id),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint borrowings_due_at_check check (due_at >= borrowed_at)
);

create table public.borrowing_items (
    id uuid primary key default gen_random_uuid(),
    borrowing_id uuid not null references public.borrowings(id),
    book_copy_id uuid not null references public.book_copies(id),
    status text not null default 'borrowed' check (status in ('borrowed', 'returned')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.returns (
    id uuid primary key default gen_random_uuid(),
    borrowing_item_id uuid unique not null references public.borrowing_items(id),
    returned_at timestamptz not null,
    condition text,
    late_days integer not null default 0 check (late_days >= 0),
    processed_by uuid references public.profiles(id),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.settings (
    id uuid primary key default gen_random_uuid(),
    key text unique not null,
    value text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index students_academic_year_id_idx
    on public.students (academic_year_id);

create index books_title_idx
    on public.books (title);

create index books_category_id_idx
    on public.books (category_id);

create index book_copies_book_id_idx
    on public.book_copies (book_id);

create index book_copies_status_idx
    on public.book_copies (status);

create index borrowings_member_id_idx
    on public.borrowings (member_id);

create index borrowings_status_idx
    on public.borrowings (status);

create index borrowings_due_at_idx
    on public.borrowings (due_at);

create index borrowing_items_borrowing_id_idx
    on public.borrowing_items (borrowing_id);

create index borrowing_items_book_copy_id_idx
    on public.borrowing_items (book_copy_id);

create unique index borrowing_items_active_copy_idx
    on public.borrowing_items (book_copy_id)
    where status = 'borrowed';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger academic_years_set_updated_at
before update on public.academic_years
for each row execute function public.set_updated_at();

create trigger book_categories_set_updated_at
before update on public.book_categories
for each row execute function public.set_updated_at();

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

create trigger book_copies_set_updated_at
before update on public.book_copies
for each row execute function public.set_updated_at();

create trigger borrowings_set_updated_at
before update on public.borrowings
for each row execute function public.set_updated_at();

create trigger borrowing_items_set_updated_at
before update on public.borrowing_items
for each row execute function public.set_updated_at();

create trigger returns_set_updated_at
before update on public.returns
for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.students enable row level security;
alter table public.academic_years enable row level security;
alter table public.book_categories enable row level security;
alter table public.books enable row level security;
alter table public.book_copies enable row level security;
alter table public.borrowings enable row level security;
alter table public.borrowing_items enable row level security;
alter table public.returns enable row level security;
alter table public.settings enable row level security;
