create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  matric_number text not null unique,
  email text not null,
  mtu_email text not null,
  phone_number text not null,
  parent_email text not null,
  parent_phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  matric_number text not null unique references public.students (matric_number) on delete cascade,
  pdf_url text not null,
  uploaded_at timestamptz not null default now(),
  published_at timestamptz,
  delivery_state text not null default 'pending',
  delivery_attempts integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  matric_number text not null references public.students (matric_number) on delete cascade,
  email_status text not null,
  sms_status text not null,
  whatsapp_status text not null,
  timestamp timestamptz not null default now(),
  error_message text
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target text,
  status text not null default 'success',
  detail text,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;
alter table public.results enable row level security;
alter table public.admins enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_logs enable row level security;

drop policy if exists "students can insert their own registration" on public.students;
drop policy if exists "students can read their own registration" on public.students;
drop policy if exists "service role can manage results" on public.results;
drop policy if exists "service role can manage admins" on public.admins;
drop policy if exists "service role can manage notifications" on public.notifications;
drop policy if exists "service role can manage admin logs" on public.admin_logs;

create policy "students can insert their own registration"
  on public.students
  for insert
  to anon, authenticated
  with check (true);

create policy "students can read their own registration"
  on public.students
  for select
  to authenticated
  using (true);
create policy "service role can manage results"
  on public.results
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service role can manage admins"
  on public.admins
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service role can manage notifications"
  on public.notifications
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service role can manage admin logs"
  on public.admin_logs
  for all
  to authenticated
  using (true)
  with check (true);

create index if not exists students_matric_number_idx on public.students (matric_number);
create index if not exists results_delivery_state_idx on public.results (delivery_state);
create index if not exists notifications_timestamp_idx on public.notifications (timestamp desc);
create index if not exists admin_logs_timestamp_idx on public.admin_logs (created_at desc);
