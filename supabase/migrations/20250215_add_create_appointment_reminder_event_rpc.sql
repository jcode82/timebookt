create or replace function public.create_appointment_reminder_event(
  appointment_id uuid,
  reminder_type text,
  scheduled_for timestamptz,
  meta jsonb default '{}'::jsonb
) returns public.appointment_reminder_events
language sql
security definer
set search_path = public
as $$
  insert into public.appointment_reminder_events (
    appointment_id,
    reminder_type,
    scheduled_for,
    meta
  )
  values (
    $1,
    $2,
    $3,
    coalesce($4, '{}'::jsonb)
  )
  returning *;
$$;
