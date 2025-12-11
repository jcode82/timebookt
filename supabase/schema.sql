-- TimeBookt foundational schema
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  region_code text default 'global',
  timezone text not null default 'America/New_York',
  contact_email text not null,
  contact_phone text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
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
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
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
  actor_type text not null,
  actor_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Enable Row Level Security
alter table public.businesses enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.appointments enable row level security;
alter table public.templates enable row level security;
alter table public.audit_logs enable row level security;

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
