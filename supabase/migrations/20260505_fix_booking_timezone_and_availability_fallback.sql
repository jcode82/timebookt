create or replace function public.create_appointment(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_region_code text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_staff_id uuid,
  p_notes text
) returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block public.availability_blocks;
  v_exception public.availability_exceptions;
  v_capacity integer := 1;
  v_overlap_count integer := 0;
  v_day_of_week smallint;
  v_exception_date date;
  v_start_time time;
  v_end_time time;
  v_appointment public.appointments;
  v_business_timezone text := 'America/New_York';
begin
  if p_end_time <= p_start_time then
    raise exception 'Invalid appointment time window' using errcode = 'P0001';
  end if;

  select coalesce(b.timezone, 'America/New_York')
  into v_business_timezone
  from public.businesses as b
  where b.id = p_business_id;

  if p_staff_id is not null then
    v_day_of_week := extract(dow from p_start_time at time zone v_business_timezone);
    v_exception_date := (p_start_time at time zone v_business_timezone)::date;
    v_start_time := (p_start_time at time zone v_business_timezone)::time;
    v_end_time := (p_end_time at time zone v_business_timezone)::time;

    select *
    into v_exception
    from public.availability_exceptions as ae
    where ae.business_id = p_business_id
      and ae.staff_id = p_staff_id
      and ae.region_code = p_region_code
      and ae.exception_date = v_exception_date
    order by ae.created_at desc
    limit 1
    for update;

    if found then
      if v_exception.is_closed
        or v_exception.start_time is null
        or v_exception.end_time is null
        or v_start_time < v_exception.start_time
        or v_end_time > v_exception.end_time then
        raise exception 'Appointment outside availability' using errcode = 'P0001';
      end if;

      v_capacity := greatest(coalesce(v_exception.capacity, 1), 1);
    else
      select *
      into v_block
      from public.availability_blocks as ab
      where ab.business_id = p_business_id
        and ab.region_code = p_region_code
        and ab.day_of_week = v_day_of_week
        and (ab.staff_id = p_staff_id or ab.staff_id is null)
        and v_start_time >= ab.start_time
        and v_end_time <= ab.end_time
      order by
        case
          when ab.staff_id = p_staff_id then 0
          else 1
        end,
        ab.created_at desc,
        ab.start_time desc
      limit 1
      for update;

      if found then
        v_capacity := greatest(coalesce(v_block.capacity, 1), 1);
      else
        perform pg_advisory_xact_lock(
          hashtextextended(
            p_staff_id::text || ':' || to_char(p_start_time at time zone v_business_timezone, 'YYYY-MM-DD'),
            0
          )
        );
      end if;
    end if;

    select count(*)
    into v_overlap_count
    from public.appointments as a
    where a.staff_id = p_staff_id
      and a.business_id = p_business_id
      and a.region_code = p_region_code
      and a.status <> 'canceled'
      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)');

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
    p_business_id,
    p_customer_id,
    p_service_id,
    p_region_code,
    p_start_time,
    p_end_time,
    p_staff_id,
    p_notes
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
  v_exception public.availability_exceptions;
  v_capacity integer := 1;
  v_overlap_count integer := 0;
  v_day_of_week smallint;
  v_exception_date date;
  v_start_time time;
  v_end_time time;
  v_business_timezone text := 'America/New_York';
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

  select coalesce(b.timezone, 'America/New_York')
  into v_business_timezone
  from public.businesses as b
  where b.id = v_appointment.business_id;

  if v_appointment.staff_id is not null then
    v_day_of_week := extract(dow from p_new_start_time at time zone v_business_timezone);
    v_exception_date := (p_new_start_time at time zone v_business_timezone)::date;
    v_start_time := (p_new_start_time at time zone v_business_timezone)::time;
    v_end_time := (p_new_end_time at time zone v_business_timezone)::time;

    select *
    into v_exception
    from public.availability_exceptions as ae
    where ae.business_id = v_appointment.business_id
      and ae.staff_id = v_appointment.staff_id
      and ae.region_code = v_appointment.region_code
      and ae.exception_date = v_exception_date
    order by ae.created_at desc
    limit 1
    for update;

    if found then
      if v_exception.is_closed
        or v_exception.start_time is null
        or v_exception.end_time is null
        or v_start_time < v_exception.start_time
        or v_end_time > v_exception.end_time then
        raise exception 'Appointment outside availability' using errcode = 'P0001';
      end if;

      v_capacity := greatest(coalesce(v_exception.capacity, 1), 1);
    else
      select *
      into v_block
      from public.availability_blocks as ab
      where ab.business_id = v_appointment.business_id
        and ab.region_code = v_appointment.region_code
        and ab.day_of_week = v_day_of_week
        and (ab.staff_id = v_appointment.staff_id or ab.staff_id is null)
        and v_start_time >= ab.start_time
        and v_end_time <= ab.end_time
      order by
        case
          when ab.staff_id = v_appointment.staff_id then 0
          else 1
        end,
        ab.created_at desc,
        ab.start_time desc
      limit 1
      for update;

      if found then
        v_capacity := greatest(coalesce(v_block.capacity, 1), 1);
      else
        perform pg_advisory_xact_lock(
          hashtextextended(
            v_appointment.staff_id::text || ':' || to_char(p_new_start_time at time zone v_business_timezone, 'YYYY-MM-DD'),
            0
          )
        );
      end if;
    end if;

    select count(*)
    into v_overlap_count
    from public.appointments as a
    where a.staff_id = v_appointment.staff_id
      and a.business_id = v_appointment.business_id
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
  set start_time = p_new_start_time,
      end_time = p_new_end_time,
      updated_at = timezone('utc', now())
  where id = v_appointment.id
  returning * into v_appointment;

  insert into public.appointment_audit_logs (
    appointment_id,
    event_type,
    actor_type,
    actor_id,
    metadata
  ) values (
    v_appointment.id,
    'rescheduled',
    'user',
    null,
    jsonb_build_object(
      'from_start_time', v_from_start,
      'from_end_time', v_from_end,
      'to_start_time', p_new_start_time,
      'to_end_time', p_new_end_time,
      'reason', p_reason,
      'source', p_source
    )
  );

  return v_appointment;
end;
$$;
