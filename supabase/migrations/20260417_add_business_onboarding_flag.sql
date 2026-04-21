alter table public.businesses
  add column if not exists is_onboarded boolean not null default false;
