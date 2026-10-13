-- ==============================================================================
-- 1. EXTENSIONS & FUNCTIONS
-- ==============================================================================
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. PUBLISHERS REGISTRY (Linked to Supabase Auth)
-- ==============================================================================
create table if not exists public.publishers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

comment on table public.publishers is 'Authorized staff/publishers permitted to manage academic content.';

-- Security Definer function to check if the active caller is an authorized publisher
create or replace function public.is_publisher()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.publishers where id = auth.uid()
  );
$$;

revoke all on function public.is_publisher() from public;
grant execute on function public.is_publisher() to anon, authenticated, service_role;

-- ==============================================================================
-- 3. COURSES TABLE
-- ==============================================================================
create table if not exists public.courses (
  id text primary key, -- e.g. 'c1', 'c2' or slug
  code text not null unique, -- e.g. 'CS 201'
  name_ar text not null,
  name_en text not null,
  instructor_ar text not null,
  instructor_en text not null,
  color text not null default '#1f3d6b',
  credits smallint not null default 3 check (credits > 0),
  desc_ar text not null default '',
  desc_en text not null default '',
  sort_order smallint not null default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

comment on table public.courses is 'Department academic courses with bilingual details and instructor metadata.';

-- ==============================================================================
-- 4. TIMETABLE SLOTS TABLE (Recurring Weekly Schedule)
-- ==============================================================================
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=Sunday, 1=Monday ... 4=Thursday
  start_time text not null check (start_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  end_time text not null check (end_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  room text not null,
  kind text not null check (kind in ('lecture', 'lab')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  check (start_time < end_time),
  constraint uq_slots_schedule unique (course_id, weekday, start_time, room)
);

create index if not exists idx_slots_course on public.slots(course_id);
create index if not exists idx_slots_weekday on public.slots(weekday);

-- Idempotent check and addition of uq_slots_schedule for pre-existing tables
do $$
declare
  v_dup_count int;
  v_dup_details text;
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public'
      and c.conrelid = 'public.slots'::regclass
      and c.conname = 'uq_slots_schedule'
  ) then
    -- Check for duplicate slot schedules matching seed target (course_id, weekday, start_time, room)
    select count(*), string_agg(format('(course: %s, weekday: %s, start: %s, room: %s, count: %s)', course_id, weekday, start_time, room, cnt), '; ')
    into v_dup_count, v_dup_details
    from (
      select course_id, weekday, start_time, room, count(*) as cnt
      from public.slots
      group by course_id, weekday, start_time, room
      having count(*) > 1
    ) dup;

    if v_dup_count > 0 then
      raise exception 'Cannot add unique constraint uq_slots_schedule: % duplicate slot group(s) detected: %. Please resolve or remove duplicates before running migration.', v_dup_count, v_dup_details;
    end if;

    alter table public.slots
      add constraint uq_slots_schedule unique (course_id, weekday, start_time, room);
  end if;
end;
$$;

-- Idempotent check and addition of chk_slots_time_order for pre-existing tables
do $$
declare
  v_invalid_count int;
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public'
      and c.conrelid = 'public.slots'::regclass
      and c.conname = 'chk_slots_time_order'
  ) then
    select count(*)
    into v_invalid_count
    from public.slots
    where start_time >= end_time;

    if v_invalid_count > 0 then
      raise exception 'Cannot add check constraint chk_slots_time_order: % slot(s) found with start_time >= end_time. Please correct slot timings before running migration.', v_invalid_count;
    end if;

    alter table public.slots
      add constraint chk_slots_time_order check (start_time < end_time);
  end if;
end;
$$;

comment on table public.slots is 'Recurring weekly lecture and practical lab timetable slots.';

-- ==============================================================================
-- 5. SCHEDULE EXCEPTIONS TABLE (Date-Specific Overrides)
-- ==============================================================================
create table if not exists public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  exception_date date not null,
  type text not null check (type in ('cancelled', 'moved', 'room')),
  start_time text check (start_time is null or start_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  end_time text check (end_time is null or end_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  room text,
  note_ar text not null default '',
  note_en text not null default '',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (slot_id, exception_date)
);

create index if not exists idx_exceptions_date on public.schedule_exceptions(exception_date);

-- Idempotent check and addition of uq_exceptions_slot_date for pre-existing tables
do $$
declare
  v_dup_count int;
  v_dup_details text;
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public'
      and c.conrelid = 'public.schedule_exceptions'::regclass
      and c.conname in ('uq_exceptions_slot_date', 'schedule_exceptions_slot_id_exception_date_key')
  ) then
    select count(*), string_agg(format('(slot_id: %s, date: %s, count: %s)', slot_id, exception_date, cnt), '; ')
    into v_dup_count, v_dup_details
    from (
      select slot_id, exception_date, count(*) as cnt
      from public.schedule_exceptions
      group by slot_id, exception_date
      having count(*) > 1
    ) dup;

    if v_dup_count > 0 then
      raise exception 'Cannot add unique constraint on schedule_exceptions: % duplicate exception group(s) detected: %. Please resolve duplicates before running migration.', v_dup_count, v_dup_details;
    end if;

    alter table public.schedule_exceptions
      add constraint uq_exceptions_slot_date unique (slot_id, exception_date);
  end if;
end;
$$;

comment on table public.schedule_exceptions is 'Calendar-specific overrides for regular slots (cancellations, room moves, time changes).';

-- ==============================================================================
-- 6. LEARNING RESOURCES TABLE
-- ==============================================================================
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  type text not null check (type in ('notes', 'summary', 'source', 'prep', 'pastExam', 'other')),
  title_ar text not null,
  title_en text not null,
  published_at date not null default current_date,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_resources_course on public.resources(course_id);
create index if not exists idx_resources_published on public.resources(published_at desc);

-- ==============================================================================
-- 7. ACTIVITIES TABLE (Exams & Assignments)
-- ==============================================================================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  kind text not null check (kind in ('exam', 'assignment')),
  title_ar text not null,
  title_en text not null,
  due_date date not null,
  due_time text not null default '23:59',
  place_ar text not null default 'تسليم إلكتروني',
  place_en text not null default 'Online submission',
  desc_ar text not null default '',
  desc_en text not null default '',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_activities_due on public.activities(due_date asc);
create index if not exists idx_activities_course on public.activities(course_id);

-- ==============================================================================
-- 8. REPORTS TABLE (Academic Reports)
-- ==============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  category text not null check (category in ('course', 'lab', 'project')),
  title_ar text not null,
  title_en text not null,
  author_ar text not null default 'الناشر',
  author_en text not null default 'Publisher',
  published_at date not null default current_date,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_reports_course on public.reports(course_id);

-- ==============================================================================
-- 9. ATTACHMENTS TABLE
-- ==============================================================================
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references public.resources(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  file_name text not null,
  file_size_bytes bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  access text not null default 'public' check (access in ('public', 'restricted')),
  storage_bucket text not null check (storage_bucket in ('attachments-public', 'attachments-restricted')),
  storage_path text not null unique,
  version int not null default 1,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  constraint chk_attachment_single_parent check (
    (resource_id is not null)::int +
    (activity_id is not null)::int +
    (report_id is not null)::int <= 1
  )
);

create index if not exists idx_attachments_resource on public.attachments(resource_id);
create index if not exists idx_attachments_activity on public.attachments(activity_id);
create index if not exists idx_attachments_report on public.attachments(report_id);
create index if not exists idx_attachments_access on public.attachments(access);

-- Idempotent check and addition of columns and constraints for pre-existing tables
do $$
declare
  v_invalid_count int;
begin
  -- Idempotently add version column if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attachments' and column_name = 'version'
  ) then
    alter table public.attachments add column version int not null default 1;
  end if;

  -- Idempotently add updated_at column if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attachments' and column_name = 'updated_at'
  ) then
    alter table public.attachments add column updated_at timestamptz default timezone('utc'::text, now()) not null;
  end if;

  -- Idempotently verify and add chk_attachment_single_parent
  if not exists (
    select 1
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public'
      and c.conrelid = 'public.attachments'::regclass
      and c.conname = 'chk_attachment_single_parent'
  ) then
    select count(*)
    into v_invalid_count
    from public.attachments
    where ((resource_id is not null)::int + (activity_id is not null)::int + (report_id is not null)::int) <> 1;

    if v_invalid_count > 0 then
      raise exception 'Cannot add check constraint chk_attachment_single_parent: % attachment row(s) found with invalid parent count. Each attachment must belong to exactly one resource, activity, or report.', v_invalid_count;
    end if;

    alter table public.attachments
      add constraint chk_attachment_single_parent check (
        (resource_id is not null)::int +
        (activity_id is not null)::int +
        (report_id is not null)::int = 1
      );
  end if;
end;
$$;

-- ==============================================================================
-- 10. STORAGE CLEANUP QUEUE TABLE (Decoupled Physical Storage Purge)
-- ==============================================================================
create table if not exists public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid,
  storage_bucket text not null check (storage_bucket in ('attachments-public', 'attachments-restricted')),
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  processed_at timestamptz
);

create index if not exists idx_storage_cleanup_status on public.storage_cleanup_queue(status, created_at);
create index if not exists idx_storage_cleanup_attachment on public.storage_cleanup_queue(attachment_id);
create index if not exists idx_storage_cleanup_bucket_path on public.storage_cleanup_queue(storage_bucket, storage_path);

comment on table public.storage_cleanup_queue is 'Queue of deleted attachments awaiting physical binary cleanup in Supabase Storage via official Storage API.';

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.publishers enable row level security;
alter table public.courses enable row level security;
alter table public.slots enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.resources enable row level security;
alter table public.activities enable row level security;
alter table public.reports enable row level security;
alter table public.attachments enable row level security;
alter table public.storage_cleanup_queue enable row level security;

-- A. Public SELECT policies (Unauthenticated visitors can read all catalog items)
drop policy if exists "Allow public select on courses" on public.courses;
create policy "Allow public select on courses" on public.courses for select using (true);

drop policy if exists "Allow public select on slots" on public.slots;
create policy "Allow public select on slots" on public.slots for select using (true);

drop policy if exists "Allow public select on schedule_exceptions" on public.schedule_exceptions;
create policy "Allow public select on schedule_exceptions" on public.schedule_exceptions for select using (true);

drop policy if exists "Allow public select on resources" on public.resources;
create policy "Allow public select on resources" on public.resources for select using (true);

drop policy if exists "Allow public select on activities" on public.activities;
create policy "Allow public select on activities" on public.activities for select using (true);

drop policy if exists "Allow public select on reports" on public.reports;
create policy "Allow public select on reports" on public.reports for select using (true);

-- B. Attachments SELECT policy:
-- Public can only see public attachment rows; publishers can see all attachment rows
drop policy if exists "Allow select attachments" on public.attachments;
create policy "Allow select attachments" on public.attachments for select
  using (access = 'public' or (select public.is_publisher()));

-- C. Publishers CRUD policies (Only verified publishers can insert, update, or delete)
drop policy if exists "Publishers can view publishers" on public.publishers;
create policy "Publishers can view publishers" on public.publishers for select using ((select public.is_publisher()));

drop policy if exists "Publishers can insert courses" on public.courses;
create policy "Publishers can insert courses" on public.courses for insert with check ((select public.is_publisher()));
drop policy if exists "Publishers can update courses" on public.courses;
create policy "Publishers can update courses" on public.courses for update using ((select public.is_publisher())) with check ((select public.is_publisher()));
drop policy if exists "Publishers can delete courses" on public.courses;
create policy "Publishers can delete courses" on public.courses for delete using ((select public.is_publisher()));

drop policy if exists "Publishers can insert slots" on public.slots;
create policy "Publishers can insert slots" on public.slots for insert with check ((select public.is_publisher()));
drop policy if exists "Publishers can update slots" on public.slots;
create policy "Publishers can update slots" on public.slots for update using ((select public.is_publisher())) with check ((select public.is_publisher()));
drop policy if exists "Publishers can delete slots" on public.slots;
create policy "Publishers can delete slots" on public.slots for delete using ((select public.is_publisher()));

drop policy if exists "Publishers can insert exceptions" on public.schedule_exceptions;
create policy "Publishers can insert exceptions" on public.schedule_exceptions for insert with check ((select public.is_publisher()));
drop policy if exists "Publishers can update exceptions" on public.schedule_exceptions;
create policy "Publishers can update exceptions" on public.schedule_exceptions for update using ((select public.is_publisher())) with check ((select public.is_publisher()));
drop policy if exists "Publishers can delete exceptions" on public.schedule_exceptions;
create policy "Publishers can delete exceptions" on public.schedule_exceptions for delete using ((select public.is_publisher()));

drop policy if exists "Publishers can insert resources" on public.resources;
create policy "Publishers can insert resources" on public.resources for insert with check ((select public.is_publisher()));
drop policy if exists "Publishers can update resources" on public.resources;
create policy "Publishers can update resources" on public.resources for update using ((select public.is_publisher())) with check ((select public.is_publisher()));
drop policy if exists "Publishers can delete resources" on public.resources;
create policy "Publishers can delete resources" on public.resources for delete using ((select public.is_publisher()));

drop policy if exists "Publishers can insert activities" on public.activities;
create policy "Publishers can insert activities" on public.activities for insert with check ((select public.is_publisher()));
drop policy if exists "Publishers can update activities" on public.activities;
create policy "Publishers can update activities" on public.activities for update using ((select public.is_publisher())) with check ((select public.is_publisher()));
drop policy if exists "Publishers can delete activities" on public.activities;
create policy "Publishers can delete activities" on public.activities for delete using ((select public.is_publisher()));

drop policy if exists "Publishers can insert reports" on public.reports;
create policy "Publishers can insert reports" on public.reports for insert with check ((select public.is_publisher()));
drop policy if exists "Publishers can update reports" on public.reports;
create policy "Publishers can update reports" on public.reports for update using ((select public.is_publisher())) with check ((select public.is_publisher()));
drop policy if exists "Publishers can delete reports" on public.reports;
create policy "Publishers can delete reports" on public.reports for delete using ((select public.is_publisher()));

drop policy if exists "Publishers can insert attachments" on public.attachments;
create policy "Publishers can insert attachments" on public.attachments for insert with check ((select public.is_publisher()));
drop policy if exists "Publishers can update attachments" on public.attachments;
create policy "Publishers can update attachments" on public.attachments for update using ((select public.is_publisher())) with check ((select public.is_publisher()));
drop policy if exists "Publishers can delete attachments" on public.attachments;
create policy "Publishers can delete attachments" on public.attachments for delete using ((select public.is_publisher()));

-- D. Storage Cleanup Queue Policies (Publishers only)
drop policy if exists "Publishers can view cleanup queue" on public.storage_cleanup_queue;
create policy "Publishers can view cleanup queue" on public.storage_cleanup_queue for select using ((select public.is_publisher()));

drop policy if exists "Publishers can insert cleanup queue" on public.storage_cleanup_queue;
create policy "Publishers can insert cleanup queue" on public.storage_cleanup_queue for insert with check ((select public.is_publisher()));

drop policy if exists "Publishers can update cleanup queue" on public.storage_cleanup_queue;
create policy "Publishers can update cleanup queue" on public.storage_cleanup_queue for update using ((select public.is_publisher())) with check ((select public.is_publisher()));

drop policy if exists "Publishers can delete cleanup queue" on public.storage_cleanup_queue;
create policy "Publishers can delete cleanup queue" on public.storage_cleanup_queue for delete using ((select public.is_publisher()));

-- ==============================================================================
-- 12. STORAGE BUCKETS SETUP
-- ==============================================================================
insert into storage.buckets (id, name, public)
values 
  ('attachments-public', 'attachments-public', true),
  ('attachments-restricted', 'attachments-restricted', false)
on conflict (id) do nothing;

drop policy if exists "Public Access to attachments-public" on storage.objects;
create policy "Public Access to attachments-public"
on storage.objects for select
using (bucket_id = 'attachments-public');

drop policy if exists "Publishers upload to attachments-public" on storage.objects;
create policy "Publishers upload to attachments-public"
on storage.objects for insert
with check (bucket_id = 'attachments-public' and (select public.is_publisher()));

drop policy if exists "Publishers delete from attachments-public" on storage.objects;
create policy "Publishers delete from attachments-public"
on storage.objects for delete
using (bucket_id = 'attachments-public' and (select public.is_publisher()));

drop policy if exists "Publishers select attachments-restricted" on storage.objects;
create policy "Publishers select attachments-restricted"
on storage.objects for select
using (bucket_id = 'attachments-restricted' and (select public.is_publisher()));

drop policy if exists "Publishers upload to attachments-restricted" on storage.objects;
create policy "Publishers upload to attachments-restricted"
on storage.objects for insert
with check (bucket_id = 'attachments-restricted' and (select public.is_publisher()));

drop policy if exists "Publishers delete from attachments-restricted" on storage.objects;
create policy "Publishers delete from attachments-restricted"
on storage.objects for delete
using (bucket_id = 'attachments-restricted' and (select public.is_publisher()));

-- ==============================================================================
-- 13. STORAGE CLEANUP TRIGGER
-- Enqueues deleted attachment records into storage_cleanup_queue for reliable,
-- auditable, and retryable storage deletion via the official Storage API.
-- ==============================================================================
create or replace function public.enqueue_storage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.storage_cleanup_queue (
    attachment_id,
    storage_bucket,
    storage_path,
    status
  ) values (
    old.id,
    old.storage_bucket,
    old.storage_path,
    'pending'
  );
  return old;
end;
$$;

drop trigger if exists tr_delete_storage_attachment on public.attachments;
create trigger tr_delete_storage_attachment
after delete on public.attachments
for each row
execute function public.enqueue_storage_cleanup();

-- Drop legacy direct storage.objects manipulation function if it exists
drop function if exists public.handle_deleted_attachment();


