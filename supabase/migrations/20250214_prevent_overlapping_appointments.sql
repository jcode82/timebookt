-- Prevent overlapping appointments per provider in the same region
create extension if not exists btree_gist;

alter table public.appointments
  add constraint appointments_no_overlap_per_provider
  exclude using gist (
    staff_id with =,
    region_code with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status <> 'canceled');
