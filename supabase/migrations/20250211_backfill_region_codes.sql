-- Align existing child rows with their parent business region.
-- Safe to run multiple times; only mismatched rows are updated.

update public.staff s
set region_code = b.region_code
from public.businesses b
where s.business_id = b.id
  and s.region_code <> b.region_code;

update public.services s
set region_code = b.region_code
from public.businesses b
where s.business_id = b.id
  and s.region_code <> b.region_code;

update public.customers c
set region_code = b.region_code
from public.businesses b
where c.business_id = b.id
  and c.region_code <> b.region_code;

update public.availability_blocks a
set region_code = b.region_code
from public.businesses b
where a.business_id = b.id
  and a.region_code <> b.region_code;

update public.appointments a
set region_code = b.region_code
from public.businesses b
where a.business_id = b.id
  and a.region_code <> b.region_code;

update public.templates t
set region_code = b.region_code
from public.businesses b
where t.business_id = b.id
  and t.region_code <> b.region_code;

update public.audit_logs l
set region_code = b.region_code
from public.businesses b
where l.business_id = b.id
  and l.region_code <> b.region_code;
