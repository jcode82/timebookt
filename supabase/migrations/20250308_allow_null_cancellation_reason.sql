create or replace function public.cancel_appointment(
  appointment_id uuid,
  region_code text,
  cancellation_reason text default null
) returns public.appointments
language sql
security definer
set search_path = public
as $$
  update public.appointments as a
  set
    status = 'canceled',
    cancellation_reason = $3,
    updated_at = timezone('utc', now())
  where a.id = $1
    and a.region_code = $2
  returning *;
$$;
