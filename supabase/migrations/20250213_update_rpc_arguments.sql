-- Ensure RPC function arguments match the payload keys used by the app

create or replace function public.create_waitlist_entry(email text)
returns public.waitlist
language sql
security definer
set search_path = public
as $$
  insert into public.waitlist (email)
  values ($1)
  on conflict (email) do update
    set email = excluded.email
  returning *;
$$;

create or replace function public.create_business(
  slug text,
  name text,
  region_code text,
  timezone text,
  contact_email text,
  description text default null,
  contact_phone text default null,
  settings jsonb default '{}'::jsonb
) returns public.businesses
language sql
security definer
set search_path = public
as $$
  insert into public.businesses (
    slug,
    name,
    region_code,
    timezone,
    contact_email,
    description,
    contact_phone,
    settings
  )
  values (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    coalesce($8, '{}'::jsonb)
  )
  returning *;
$$;

create or replace function public.create_customer(
  business_id uuid,
  region_code text,
  full_name text,
  email text,
  phone text default null,
  locale text default 'en-US'
) returns public.customers
language sql
security definer
set search_path = public
as $$
  insert into public.customers (
    business_id,
    region_code,
    full_name,
    email,
    phone,
    locale
  )
  values (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
  )
  returning *;
$$;

create or replace function public.create_template(
  business_id uuid,
  region_code text,
  slug text,
  channel text,
  name text,
  body text,
  locale text,
  subject text
) returns public.templates
language sql
security definer
set search_path = public
as $$
  insert into public.templates (
    business_id,
    region_code,
    slug,
    channel,
    name,
    body,
    locale,
    subject
  )
  values (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8
  )
  returning *;
$$;

create or replace function public.update_template(
  template_id uuid,
  business_id uuid,
  region_code text,
  patch jsonb default '{}'::jsonb
) returns public.templates
language sql
security definer
set search_path = public
as $$
  update public.templates as t
  set
    name = case when $4 ? 'name' then $4->>'name' else name end,
    subject = case when $4 ? 'subject' then $4->>'subject' else subject end,
    body = case when $4 ? 'body' then $4->>'body' else body end,
    locale = case when $4 ? 'locale' then $4->>'locale' else locale end,
    updated_at = timezone('utc', now())
  where t.id = $1
    and t.business_id = $2
    and t.region_code = $3
  returning *;
$$;

create or replace function public.create_appointment(
  business_id uuid,
  customer_id uuid,
  service_id uuid,
  region_code text,
  start_time timestamptz,
  end_time timestamptz,
  staff_id uuid,
  notes text
) returns public.appointments
language sql
security definer
set search_path = public
as $$
  insert into public.appointments (
    business_id,
    customer_id,
    service_id,
    region_code,
    start_time,
    end_time,
    staff_id,
    notes
  )
  values (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8
  )
  returning *;
$$;

create or replace function public.cancel_appointment(
  appointment_id uuid,
  region_code text,
  cancellation_reason text default 'canceled-by-admin'
) returns public.appointments
language sql
security definer
set search_path = public
as $$
  update public.appointments as a
  set
    status = 'canceled',
    cancellation_reason = coalesce($3, 'canceled-by-admin'),
    updated_at = timezone('utc', now())
  where a.id = $1
    and a.region_code = $2
  returning *;
$$;
