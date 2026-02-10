-- Drop older signatures first because PostgreSQL does not allow renaming
-- input parameters via CREATE OR REPLACE.
drop function if exists public.create_appointment(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz,
  uuid,
  text
);

drop function if exists public.create_appointment(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz,
  text
);

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
  v_capacity integer := 1;
  v_overlap_count integer := 0;
  v_day_of_week smallint;
  v_appointment public.appointments;
begin
  if p_end_time <= p_start_time then
    raise exception 'Invalid appointment time window' using errcode = 'P0001';
  end if;

  if p_staff_id is not null then
    v_day_of_week := extract(dow from p_start_time at time zone 'utc');

    select *
    into v_block
    from public.availability_blocks as ab
    where ab.business_id = p_business_id
      and ab.staff_id = p_staff_id
      and ab.region_code = p_region_code
      and ab.day_of_week = v_day_of_week
      and (p_start_time at time zone 'utc')::time >= (ab.start_time at time zone 'utc')::time
      and (p_end_time at time zone 'utc')::time <= (ab.end_time at time zone 'utc')::time
    order by ab.start_time asc
    limit 1
    for update;

    if found then
      v_capacity := greatest(coalesce(v_block.capacity, 1), 1);
    else
      perform pg_advisory_xact_lock(
        hashtextextended(
          p_staff_id::text || ':' || to_char(p_start_time at time zone 'utc', 'YYYY-MM-DD'),
          0
        )
      );
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
