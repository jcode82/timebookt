create or replace function public.update_service(
  service_id uuid,
  business_id uuid,
  region_code text,
  patch jsonb default '{}'::jsonb
) returns public.services
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services;
begin
  update public.services as s
  set
    name = case when patch ? 'name' then patch->>'name' else s.name end,
    description = case when patch ? 'description' then patch->>'description' else s.description end,
    duration_minutes = case
      when patch ? 'duration_minutes' then (patch->>'duration_minutes')::integer
      else s.duration_minutes
    end,
    price_cents = case
      when patch ? 'price_cents' then (patch->>'price_cents')::integer
      else s.price_cents
    end,
    currency = case when patch ? 'currency' then patch->>'currency' else s.currency end,
    is_active = case
      when patch ? 'is_active' then (patch->>'is_active')::boolean
      else s.is_active
    end,
    updated_at = timezone('utc', now())
  where s.id = $1
    and s.business_id = $2
    and s.region_code = $3
  returning * into v_service;

  if v_service is null then
    raise exception 'update_service did not match a service row';
  end if;

  return v_service;
end;
$$;
