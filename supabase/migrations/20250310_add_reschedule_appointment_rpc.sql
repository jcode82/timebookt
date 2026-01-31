create table if not exists public.appointment_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type text not null,
  from_start_time timestamptz not null,
  from_end_time timestamptz not null,
  to_start_time timestamptz not null,
  to_end_time timestamptz not null,
  reason text null,
  source text null,
  created_at timestamptz not null default now()
);

create index if not exists appointment_lifecycle_events_appt_idx
  on public.appointment_lifecycle_events (appointment_id);

alter table public.appointment_lifecycle_events enable row level security;

create policy "Service role manages appointment lifecycle events" on public.appointment_lifecycle_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_region_code text,
  p_new_start_time timestamptz,
  p_new_end_time timestamptz,
  p_reason text default null,
  p_source text default null
) returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_from_start timestamptz;
  v_from_end timestamptz;
begin
  select *
  into v_appointment
  from public.appointments
  where id = p_appointment_id
    and region_code = p_region_code
  for update;

  if not found then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;

  if v_appointment.status = 'canceled' then
    raise exception 'Cannot reschedule a canceled appointment' using errcode = 'P0001';
  end if;

  if p_new_end_time <= p_new_start_time then
    raise exception 'Invalid appointment time window' using errcode = 'P0001';
  end if;

  if p_new_start_time < timezone('utc', now()) then
    raise exception 'Cannot reschedule into the past' using errcode = 'P0001';
  end if;

  v_from_start := v_appointment.start_time;
  v_from_end := v_appointment.end_time;

  update public.appointments
  set
    start_time = p_new_start_time,
    end_time = p_new_end_time,
    updated_at = timezone('utc', now())
  where id = v_appointment.id
  returning * into v_appointment;

  insert into public.appointment_lifecycle_events (
    appointment_id,
    event_type,
    from_start_time,
    from_end_time,
    to_start_time,
    to_end_time,
    reason,
    source
  ) values (
    v_appointment.id,
    'rescheduled',
    v_from_start,
    v_from_end,
    p_new_start_time,
    p_new_end_time,
    p_reason,
    p_source
  );

  return v_appointment;
end;
$$;
