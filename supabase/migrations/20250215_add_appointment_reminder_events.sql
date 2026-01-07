create table if not exists public.appointment_reminder_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  reminder_type text not null,
  scheduled_for timestamptz not null,
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create unique index if not exists appointment_reminder_events_unique
  on public.appointment_reminder_events (appointment_id, reminder_type, scheduled_for);

create index if not exists appointment_reminder_events_appt_idx
  on public.appointment_reminder_events (appointment_id);

alter table public.appointment_reminder_events enable row level security;

create policy "Service role manages reminder events" on public.appointment_reminder_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
