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
  update public.services
  set
    name = case when patch ? 'name' then patch->>'name' else name end,
    description = case when patch ? 'description' then patch->>'description' else description end,
    duration_minutes = case
      when patch ? 'duration_minutes' then (patch->>'duration_minutes')::integer
      else duration_minutes
    end,
    price_cents = case
      when patch ? 'price_cents' then (patch->>'price_cents')::integer
      else price_cents
    end,
    currency = case when patch ? 'currency' then patch->>'currency' else currency end,
    is_active = case
      when patch ? 'is_active' then (patch->>'is_active')::boolean
      else is_active
    end,
    updated_at = timezone('utc', now())
  where id = service_id
    and business_id = update_service.business_id
    and region_code = update_service.region_code
  returning * into v_service;

  return v_service;
end;
$$;
