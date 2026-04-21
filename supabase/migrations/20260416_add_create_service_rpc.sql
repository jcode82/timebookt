create or replace function public.create_service(
  business_id uuid,
  region_code text,
  name text,
  duration_minutes integer,
  price_cents integer default 0,
  currency text default 'USD',
  description text default null
) returns public.services
language sql
security definer
set search_path = public
as $$
  insert into public.services (
    business_id,
    region_code,
    name,
    duration_minutes,
    price_cents,
    currency,
    description
  )
  values (
    $1,
    $2,
    $3,
    $4,
    coalesce($5, 0),
    coalesce($6, 'USD'),
    $7
  )
  returning *;
$$;
