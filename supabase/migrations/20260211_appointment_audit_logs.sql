do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_audit_event_type') then
    create type public.appointment_audit_event_type as enum (
      'created',
      'confirmed',
      'reminded',
      'cancelled',
      'rescheduled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'appointment_audit_actor_type') then
    create type public.appointment_audit_actor_type as enum (
      'system',
      'user',
      'staff',
      'ai'
    );
  end if;
end;
$$;

create table if not exists public.appointment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type public.appointment_audit_event_type not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_type public.appointment_audit_actor_type not null,
  actor_id uuid null,
  metadata jsonb null
);

create index if not exists appointment_audit_logs_appointment_idx
  on public.appointment_audit_logs (appointment_id);

create index if not exists appointment_audit_logs_occurred_idx
  on public.appointment_audit_logs (occurred_at desc);

alter table public.appointment_audit_logs enable row level security;

create policy "Service role can insert appointment audit logs"
  on public.appointment_audit_logs
  for insert
  with check (auth.role() = 'service_role');

create policy "Service role can read appointment audit logs"
  on public.appointment_audit_logs
  for select
  using (auth.role() = 'service_role');

create policy "Staff can read appointment audit logs"
  on public.appointment_audit_logs
  for select
  using (
    auth.uid() in (
      select s.id
      from public.staff s
      join public.appointments a on a.id = appointment_audit_logs.appointment_id
      where s.business_id = a.business_id
    )
  );

create or replace function public.block_appointment_audit_log_mutations()
returns trigger
language plpgsql
as $$
begin
  raise exception 'appointment_audit_logs are append-only';
end;
$$;

create trigger appointment_audit_logs_no_update
before update or delete on public.appointment_audit_logs
for each row execute function public.block_appointment_audit_log_mutations();
