-- Add region_code column to existing tenant tables.
-- This migration is idempotent thanks to IF NOT EXISTS guards.

alter table public.staff
  add column if not exists region_code text not null default 'global';

alter table public.services
  add column if not exists region_code text not null default 'global';

alter table public.customers
  add column if not exists region_code text not null default 'global';

alter table public.availability_blocks
  add column if not exists region_code text not null default 'global';

alter table public.appointments
  add column if not exists region_code text not null default 'global';

alter table public.templates
  add column if not exists region_code text not null default 'global';

alter table public.audit_logs
  add column if not exists region_code text not null default 'global';
