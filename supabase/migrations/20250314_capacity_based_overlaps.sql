-- Enable capacity-aware overlap checks for appointments.

alter table public.appointments
  drop constraint if exists appointments_no_overlap_per_provider;

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block public.availability_blocks;
  v_capacity integer := 1;
  v_overlap_count integer := 0;
  v_day_of_week smallint;
  v_appointment public.appointments;
begin
  if end_time <= start_time then
    raise exception 'Invalid appointment time window' using errcode = 'P0001';
  end if;

  if staff_id is not null then
    v_day_of_week := extract(dow from start_time at time zone 'utc');

    select *
    into v_block
    from public.availability_blocks as ab
    where ab.business_id = business_id
      and ab.staff_id = staff_id
      and ab.region_code = region_code
      and ab.day_of_week = v_day_of_week
      and (start_time at time zone 'utc')::time >= (ab.start_time at time zone 'utc')::time
      and (end_time at time zone 'utc')::time <= (ab.end_time at time zone 'utc')::time
    order by ab.start_time asc
    limit 1
    for update;

    if found then
      v_capacity := greatest(v_block.capacity, 1);
    else
      perform pg_advisory_xact_lock(
        hashtextextended(staff_id::text || ':' || to_char(start_time at time zone 'utc', 'YYYY-MM-DD'), 0)
      );
    end if;

    select count(*)
    into v_overlap_count
    from public.appointments as a
    where a.staff_id = staff_id
      and a.region_code = region_code
      and a.status <> 'canceled'
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(start_time, end_time, '[)');

    if v_overlap_count >= v_capacity then
      raise exception 'Appointment capacity exceeded' using errcode = 'P0001';
    end if;
  end if;

  insert into public.appointments (
    business_id,
    customer_id,
    service_id,
    region_code,
    start_time,
    end_time,
    staff_id,
    notes
  ) values (
    business_id,
    customer_id,
    service_id,
    region_code,
    start_time,
    end_time,
    staff_id,
    notes
  )
  returning * into v_appointment;

  return v_appointment;
end;
$$;

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
  v_block public.availability_blocks;
  v_capacity integer := 1;
  v_overlap_count integer := 0;
  v_day_of_week smallint;
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

  if v_appointment.staff_id is not null then
    v_day_of_week := extract(dow from p_new_start_time at time zone 'utc');

    select *
    into v_block
    from public.availability_blocks as ab
    where ab.business_id = v_appointment.business_id
      and ab.staff_id = v_appointment.staff_id
      and ab.region_code = v_appointment.region_code
      and ab.day_of_week = v_day_of_week
      and (p_new_start_time at time zone 'utc')::time >= (ab.start_time at time zone 'utc')::time
      and (p_new_end_time at time zone 'utc')::time <= (ab.end_time at time zone 'utc')::time
    order by ab.start_time asc
    limit 1
    for update;

    if found then
      v_capacity := greatest(v_block.capacity, 1);
    else
      perform pg_advisory_xact_lock(
        hashtextextended(
          v_appointment.staff_id::text || ':' || to_char(p_new_start_time at time zone 'utc', 'YYYY-MM-DD'),
          0
        )
      );
    end if;

    select count(*)
    into v_overlap_count
    from public.appointments as a
    where a.staff_id = v_appointment.staff_id
      and a.region_code = v_appointment.region_code
      and a.status <> 'canceled'
      and a.id <> v_appointment.id
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(p_new_start_time, p_new_end_time, '[)');

    if v_overlap_count >= v_capacity then
      raise exception 'Appointment capacity exceeded' using errcode = 'P0001';
    end if;
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
