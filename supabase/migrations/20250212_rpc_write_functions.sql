-- RPC helpers to centralize write operations

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.create_waitlist_entry(p_email text)
returns public.waitlist
language sql
security definer
set search_path = public
as $$
  insert into public.waitlist (email)
  values (p_email)
  on conflict (email) do update
    set email = excluded.email
  returning *;
$$;

create or replace function public.create_business(
  p_slug text,
  p_name text,
  p_description text default null,
  p_region_code text,
  p_timezone text,
  p_contact_email text,
  p_contact_phone text default null,
  p_settings jsonb default '{}'::jsonb
) returns public.businesses
language sql
security definer
set search_path = public
as $$
  insert into public.businesses (
    slug,
    name,
    description,
    region_code,
    timezone,
    contact_email,
    contact_phone,
    settings
  )
  values (
    p_slug,
    p_name,
    p_description,
    p_region_code,
    p_timezone,
    p_contact_email,
    p_contact_phone,
    coalesce(p_settings, '{}'::jsonb)
  )
  returning *;
$$;

create or replace function public.create_customer(
  p_business_id uuid,
  p_region_code text,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_locale text default 'en-US'
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
    p_business_id,
    p_region_code,
    p_full_name,
    p_email,
    p_phone,
    p_locale
  )
  returning *;
$$;

create or replace function public.create_template(
  p_business_id uuid,
  p_region_code text,
  p_slug text,
  p_channel text,
  p_name text,
  p_subject text default null,
  p_body text,
  p_locale text
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
    subject,
    body,
    locale
  )
  values (
    p_business_id,
    p_region_code,
    p_slug,
    p_channel,
    p_name,
    p_subject,
    p_body,
    p_locale
  )
  returning *;
$$;

create or replace function public.update_template(
  p_template_id uuid,
  p_business_id uuid,
  p_region_code text,
  p_patch jsonb default '{}'::jsonb
) returns public.templates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.templates;
begin
  update public.templates
  set
    name = case when p_patch ? 'name' then p_patch->>'name' else name end,
    subject = case when p_patch ? 'subject' then p_patch->>'subject' else subject end,
    body = case when p_patch ? 'body' then p_patch->>'body' else body end,
    locale = case when p_patch ? 'locale' then p_patch->>'locale' else locale end,
    updated_at = timezone('utc', now())
  where id = p_template_id
    and business_id = p_business_id
    and region_code = p_region_code
  returning * into v_template;

  return v_template;
end;
$$;

create or replace function public.create_appointment(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_staff_id uuid default null,
  p_region_code text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_notes text default null
) returns public.appointments
language sql
security definer
set search_path = public
as $$
  insert into public.appointments (
    business_id,
    customer_id,
    service_id,
    staff_id,
    region_code,
    start_time,
    end_time,
    notes
  )
  values (
    p_business_id,
    p_customer_id,
    p_service_id,
    p_staff_id,
    p_region_code,
    p_start_time,
    p_end_time,
    p_notes
  )
  returning *;
$$;

create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_region_code text,
  p_cancellation_reason text default 'canceled-by-admin'
) returns public.appointments
language sql
security definer
set search_path = public
as $$
  update public.appointments
  set
    status = 'canceled',
    cancellation_reason = coalesce(p_cancellation_reason, 'canceled-by-admin'),
    updated_at = timezone('utc', now())
  where id = p_appointment_id
    and region_code = p_region_code
  returning *;
$$;
