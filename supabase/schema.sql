-- TimeBookt foundational schema
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  region_code text not null default 'global',
  timezone text not null default 'America/New_York',
  contact_email text not null,
  contact_phone text,
  is_onboarded boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  region_code text not null default 'global',
  full_name text not null,
  email text,
  phone text,
  role text not null default 'staff',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  region_code text not null default 'global',
  name text not null,
  description text,
  duration_minutes integer not null,
  price_cents integer not null default 0,
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  region_code text not null default 'global',
  full_name text not null,
  email text not null,
  phone text,
  locale text default 'en-US',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  region_code text not null default 'global',
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  capacity integer not null default 1,
  constraint availability_blocks_capacity_positive_check check (capacity >= 1),
  constraint availability_blocks_time_window_check check (end_time > start_time),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  region_code text not null default 'global',
  exception_date date not null,
  is_closed boolean not null default false,
  start_time time,
  end_time time,
  capacity integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint availability_exceptions_capacity_positive_check check (capacity >= 1),
  constraint availability_exceptions_window_check check (
    is_closed
    or (start_time is not null and end_time is not null and end_time > start_time)
  ),
  unique (business_id, staff_id, region_code, exception_date)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  region_code text not null default 'global',
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','canceled','completed')),
  cancellation_reason text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  region_code text not null default 'global',
  slug text not null,
  channel text not null check (channel in ('email','sms')),
  name text not null,
  subject text,
  body text not null,
  locale text not null default 'en-US',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  region_code text not null default 'global',
  actor_type text not null,
  actor_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_audit_event_type') then
    create type public.appointment_audit_event_type as enum (
      'created',
      'confirmed',
      'reminded',
      'cancelled',
      'rescheduled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'appointment_audit_actor_type') then
    create type public.appointment_audit_actor_type as enum (
      'system',
      'user',
      'staff',
      'ai'
    );
  end if;
end;
$$;

create table if not exists public.appointment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type public.appointment_audit_event_type not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_type public.appointment_audit_actor_type not null,
  actor_id uuid null,
  metadata jsonb null
);

create index if not exists appointment_audit_logs_appointment_idx
  on public.appointment_audit_logs (appointment_id);

create index if not exists appointment_audit_logs_occurred_idx
  on public.appointment_audit_logs (occurred_at desc);

create or replace function public.block_appointment_audit_log_mutations()
returns trigger
language plpgsql
as $$
begin
  raise exception 'appointment_audit_logs are append-only';
end;
$$;

create trigger appointment_audit_logs_no_update
before update or delete on public.appointment_audit_logs
for each row execute function public.block_appointment_audit_log_mutations();

-- Enable Row Level Security
alter table public.businesses enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.templates enable row level security;
alter table public.audit_logs enable row level security;
alter table public.appointment_audit_logs enable row level security;

-- RLS examples
create policy "Allow business readers" on public.businesses
  for select
  using (auth.uid() is not null);

create policy "Business members manage appointments" on public.appointments
  for all using (
    auth.uid() in (
      select id from public.staff where staff.business_id = appointments.business_id
    )
  );

create policy "Customers read their appointments" on public.appointments
  for select using (
    auth.uid() = customer_id
  );

create policy "Business members manage templates" on public.templates
  for all using (
    auth.uid() in (
      select id from public.staff where staff.business_id = templates.business_id
    )
  );

create policy "Service role can insert appointment audit logs"
  on public.appointment_audit_logs
  for insert
  with check (auth.role() = 'service_role');

create policy "Service role can read appointment audit logs"
  on public.appointment_audit_logs
  for select
  using (auth.role() = 'service_role');

create policy "Staff can read appointment audit logs"
  on public.appointment_audit_logs
  for select
  using (
    auth.uid() in (
      select s.id
      from public.staff s
      join public.appointments a on a.id = appointment_audit_logs.appointment_id
      where s.business_id = a.business_id
    )
  );

create index if not exists businesses_slug_region_idx
  on public.businesses (slug, region_code);

create index if not exists availability_exceptions_provider_date_idx
  on public.availability_exceptions (business_id, staff_id, region_code, exception_date);

create policy "Service role can manage availability exceptions"
  on public.availability_exceptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
