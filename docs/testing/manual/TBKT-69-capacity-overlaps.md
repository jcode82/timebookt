Manual Test Plan — TBKT-69 Support capacity-based overlapping bookings
Preconditions

Latest migration applied: 20260219_migrate_availability_blocks_to_recurring_rules.sql

Server running locally

You have a businessId, providerId (staff), and serviceId in region fl

You have at least one availability block for the provider on the test date

Test Data Setup
A) Pick a test date and a 30-min slot window

Example slot window:

2026-02-16T14:00:00.000Z → 2026-02-16T14:30:00.000Z

B) Create/ensure an availability block with capacity = 2

Run in Supabase SQL editor (adjust IDs and times):

insert into availability_blocks (id, business_id, staff_id, region_code, start_time, end_time, capacity, day_of_week)
values (gen_random_uuid(),
        '<BUSINESS_ID>',
        '<PROVIDER_ID>',
        'fl',
        '14:00:00',
        '15:00:00',
        2,
        1
       );


Verify:

select id, business_id, staff_id, start_time, end_time, capacity, day_of_week
from availability_blocks
where business_id = '<BUSINESS_ID>'
  and staff_id = '<PROVIDER_ID>'
order by created_at desc
limit 3;

Test 1 — Slot picker shows slot while overlapCount < capacity
Goal

If capacity = 2 and there is 1 booking in the slot, the slot should still appear.

Steps

Book one appointment for 14:00–14:30 (via UI /book is fine, or API if you prefer).

Go back to selectSlots for that provider/date.

Expected

Slot 14:00–14:30 still appears (capacity 2, overlapCount 1)

No duplication/ghost slots

DB verify (optional):

select id, start_time, end_time, status
from appointments
where business_id = '<BUSINESS_ID>'
  and staff_id = '<PROVIDER_ID>'
  and start_time = '2026-02-16T14:00:00Z'
  and end_time = '2026-02-16T14:30:00Z'
order by created_at asc;


Expected: 1 row, status scheduled.

Test 2 — Booking succeeds up to capacity
Goal

You should be able to create two overlapping appointments in the same time slot when capacity=2.

Steps

Create a second appointment for the same slot (14:00–14:30).

Use UI booking flow with a different email/name.

Expected

Booking succeeds (HTTP 201 in API; UI confirms)

DB shows 2 scheduled appointments in that slot

Verify:

select id, start_time, end_time, status, created_at
from appointments
where business_id = '<BUSINESS_ID>'
  and staff_id = '<PROVIDER_ID>'
  and status <> 'canceled'
  and tstzrange(start_time, end_time, '[)') && tstzrange('2026-02-16T14:00:00Z', '2026-02-16T14:30:00Z', '[)')
order by created_at asc;


Expected: 2 rows.

Test 3 — Slot picker hides slot when capacity is full
Goal

Once overlapCount == capacity, slot must disappear (no confirm-time surprises).

Steps

With two active appointments at 14:00–14:30 (capacity 2), refresh selectSlots page.

Expected

Slot 14:00–14:30 does NOT appear

Slot 14:30–15:00 still appears (assuming no bookings there)

Test 4 — Attempting to overbook fails at confirm time AND is not offered in UI
Goal

Even if someone bypasses UI (or a race happens), DB must reject the 3rd booking.

Steps (API-level)

Try to create a third overlapping appointment (same slot) via your booking endpoint (whatever creates appointments via createCanonicalAppointment).

If you have /api/appointments POST working, use that. If booking is done through /[slug]/book POST, use that.

If /api/appointments supports POST with canonical payload, use:

curl -X POST "http://localhost:3000/api/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "<SERVICE_ID>",
    "providerId": "<PROVIDER_ID>",
    "regionCode": "fl",
    "startTime": "2026-02-16T14:00:00.000Z",
    "endTime": "2026-02-16T14:30:00.000Z",
    "customerName": "Capacity Test 3",
    "customerEmail": "cap3@example.com",
    "customerPhone": "5551112222",
    "notes": "third overlap should fail"
  }'

Expected

Request fails with 400 and a friendly message:

“Appointment overlaps an existing booking”

DB still shows only 2 active appointments for that slot

This validates:

the RPC raises P0001 Appointment capacity exceeded

your isCapacityOverlapError mapping correctly translates it

Test 5 — Cancel frees capacity immediately
Goal

Canceling one overlapping booking should free one capacity unit and make the slot available again.

Steps

Cancel one of the two overlapping appointments (call PATCH /api/appointments).

Refresh selectSlots.

Cancel:

curl -X PATCH "http://localhost:3000/api/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "<APPT_ID_TO_CANCEL>",
    "cancellationReason": "capacity-free-test"
  }'

Expected

Appointment status becomes canceled

Slot 14:00–14:30 reappears in selectSlots (because overlapCount is now 1 < capacity 2)

Booking a new appointment into that slot succeeds again (back up to 2)

DB verify:

select id, status, cancellation_reason
from appointments
where id = '<APPT_ID_TO_CANCEL>';

Test 6 — Reschedule respects capacity
Goal

Rescheduling into a full slot must fail; rescheduling into a slot with room must succeed.

Steps

Fill a slot to capacity (2 active appointments at 14:00–14:30).

Pick a different appointment X and attempt to reschedule into 14:00–14:30.

curl -X PATCH "http://localhost:3000/api/appointments/reschedule" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "<APPT_ID_X>",
    "startTime": "2026-02-16T14:00:00.000Z",
    "endTime": "2026-02-16T14:30:00.000Z",
    "reason": "capacity-reschedule-test"
  }'

Expected

Fails with 400

Error message maps to “Appointment overlaps an existing booking”

No lifecycle event inserted for the failed attempt (atomicity preserved)

Then:
3) Cancel one of the slot bookings (free capacity).
4) Retry reschedule.

Expected:

Reschedule succeeds

Lifecycle event inserted

Verify lifecycle event:

select *
from appointment_lifecycle_events
where appointment_id = '<APPT_ID_X>'
order by created_at desc
limit 1;


Expected: event_type='rescheduled' with correct from/to.

(Optional but smart) Test 7 — Multi-tenant safety check

Important: Your RPC overlap count filter uses staff_id + region_code only (not business_id).
If there’s any chance staff IDs could exist across businesses, this could cause cross-tenant interference.

If you have a single-tenant dev DB, you can skip. But I recommend adding this check later if needed:

Ensure overlap queries include business_id consistently.

“Ship it” checklist for closing TBKT-69

Before you close, confirm:

✅ Slot picker allows up to capacity and hides when full

✅ DB rejects over-capacity booking (API attempt fails)

✅ Cancel frees capacity

✅ Reschedule respects capacity rules

✅ No confirm-time surprises (UI never offers impossible slots)

✅ Tests pass (already done)

What to paste back to confirm closure

If you paste these, I can validate quickly that everything lines up:

DB query showing 2 appointments overlapping in same slot

A failed third booking response (error message + status)

A successful cancel response + slot reappearing confirmation

That’s enough evidence to close TBKT-69 with confidence.
