alter table public.appointment_reminder_events
  add column if not exists channel text not null default 'email',
  add column if not exists status text not null default 'scheduled',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists last_error jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_reminder_events_status_check'
  ) then
    alter table public.appointment_reminder_events
      add constraint appointment_reminder_events_status_check
      check (status in ('scheduled', 'sending', 'retry', 'sent', 'failed'));
  end if;
end $$;

drop index if exists appointment_reminder_events_unique;

create unique index if not exists appointment_reminder_events_unique
  on public.appointment_reminder_events (appointment_id, reminder_type, channel, scheduled_for);

create or replace function public.create_appointment_reminder_event(
  appointment_id uuid,
  reminder_type text,
  channel text,
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
    channel,
    scheduled_for,
    meta
  )
  values (
    $1,
    $2,
    $3,
    $4,
    coalesce($5, '{}'::jsonb)
  )
  on conflict (appointment_id, reminder_type, channel, scheduled_for)
  do update set meta = appointment_reminder_events.meta
  returning *;
$$;

create or replace function public.claim_appointment_reminder_event(
  reminder_event_id uuid,
  lock_timeout_seconds integer default 600,
  now_ts timestamptz default now(),
  max_attempts integer default 5
) returns public.appointment_reminder_events
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.appointment_reminder_events;
begin
  update public.appointment_reminder_events
  set status = 'sending',
      attempt_count = attempt_count + 1,
      last_attempt_at = now_ts,
      updated_at = now_ts
  where id = reminder_event_id
    and status <> 'sent'
    and attempt_count < max_attempts
    and (next_attempt_at is null or next_attempt_at <= now_ts)
    and (
      status <> 'sending'
      or last_attempt_at is null
      or last_attempt_at <= now_ts - make_interval(secs => lock_timeout_seconds)
    )
  returning * into updated_row;

  return updated_row;
end;
$$;
