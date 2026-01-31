# Manual Test Plan — TBKT-66
## Reschedule Appointment via Controlled Write

### Purpose
Validate that appointment rescheduling behaves correctly end-to-end in a real runtime environment, including database constraints, lifecycle event logging, and API behavior.

This plan complements automated unit tests by verifying:
- DB RPC wiring
- Atomicity
- Audit trail creation
- Runtime correctness across layers

---

## Preconditions
- Database migrations applied (including `reschedule_appointment` RPC and lifecycle events table)
- Local server running
- At least one business, provider, service, and availability block configured
- Ability to create appointments via `/book` flow or direct API calls

---

## Test Data
You will need:
- `business_id`
- `staff_id` (provider)
- `service_id`
- One scheduled appointment to reschedule
- One conflicting scheduled appointment (for overlap testing)

---

## Test 1 — Happy Path Reschedule

### Goal
Confirm an appointment can be rescheduled successfully while preserving identity and logging an event.

### Steps
1. Identify a scheduled appointment (`A`).
2. Choose a new, non-overlapping time within provider availability.
3. Call the reschedule API:

```bash
curl -X PATCH "http://localhost:3000/api/appointments/reschedule" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "<APPOINTMENT_ID>",
    "startTime": "2026-02-20T14:30:00.000Z",
    "endTime": "2026-02-20T15:00:00.000Z",
    "reason": "customer-requested"
  }'
```

### Expected Results
- HTTP 200 response
- Returned appointment has updated `startTime` / `endTime`
- `appointment_id` remains unchanged

### DB Verification

```sql
select id, start_time, end_time, status
from appointments
where id = '<APPOINTMENT_ID>';
```

### Event Verification

```sql
select *
from appointment_lifecycle_events
where appointment_id = '<APPOINTMENT_ID>'
order by created_at desc
limit 1;
```

Expected:
- `event_type = 'rescheduled'`
- from/to times recorded correctly

---

## Test 2 — Overlap Protection

### Goal
Ensure rescheduling into an occupied slot is rejected.

### Steps
1. Identify another scheduled appointment (`B`) that occupies the target time.
2. Attempt to reschedule appointment `A` into `B`'s time window.

### Expected Results
- HTTP 400 (or 409)
- Error indicating overlap
- Appointment `A` remains unchanged
- No lifecycle event created

---

## Test 3 — Rescheduling a Canceled Appointment

### Goal
Ensure canceled appointments cannot be rescheduled.

### Steps
1. Cancel an appointment (`C`).
2. Attempt to reschedule it via API.

### Expected Results
- HTTP 400 response
- Error indicating invalid state
- Appointment remains canceled
- No reschedule event logged

---

## Test 4 — Reschedule Into the Past

### Goal
Ensure rescheduling into the past is rejected.

### Steps
Attempt to reschedule an appointment to a time earlier than now.

### Expected Results
- HTTP 400 validation error
- No appointment update
- No lifecycle event logged

---

## Test 5 — Reminder Consistency After Reschedule

### Goal
Ensure reminders align with the updated appointment time.

### Steps
1. Reschedule an appointment to a time within the reminder window.
2. Trigger the reminders endpoint:

```bash
curl -X GET "http://localhost:3000/api/reminders" \
  -H "authorization: Bearer <CRON_SECRET>"
```

### Expected Results
- Rescheduled appointment processed based on updated `start_time`
- Canceled appointments excluded
- No duplicate reminders sent

---

## Notes
- Reschedule is a controlled write, not cancel + recreate.
- Identity is preserved; history is recorded via lifecycle events.
- Capacity is intentionally treated as `1` at this stage.
- This test plan should be rerun after changes to:
  - overlap logic
  - appointment lifecycle rules
  - reminder scheduling
