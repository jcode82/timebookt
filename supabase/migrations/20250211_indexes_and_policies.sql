-- Region aware indexes to keep scoped queries performant.

create index if not exists staff_business_region_idx
  on public.staff (business_id, region_code);

create index if not exists services_business_region_idx
  on public.services (business_id, region_code);

create index if not exists customers_business_region_idx
  on public.customers (business_id, region_code);

create index if not exists appointments_business_region_idx
  on public.appointments (business_id, region_code);

create index if not exists availability_business_region_idx
  on public.availability_blocks (business_id, region_code);

create index if not exists templates_business_region_idx
  on public.templates (business_id, region_code);

create index if not exists audit_logs_business_region_idx
  on public.audit_logs (business_id, region_code);

-- Service role read access so server actions can list tenant data.

create policy "Service role can manage staff"
  on public.staff
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role can manage services"
  on public.services
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role can manage customers"
  on public.customers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role can manage availability"
  on public.availability_blocks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role can manage appointments"
  on public.appointments
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role can manage templates"
  on public.templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role can manage audit-logs"
  on public.audit_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
