# TimeBookt Contributor HOW‑TO

This document explains **how to create and test appointments in TimeBookt** during **TBKT‑2 — Core Scheduling MVP (Phase 1)**.

It is intentionally boring, explicit, and defensive. That is a compliment.

---

## Mental Model (Read This First)

TimeBookt has **one authoritative way** to create appointments.

Everything funnels through:

**`createCanonicalAppointment()`**

UI, API routes, AI agents, and future integrations *must* call this function. Nothing else is allowed to write appointments directly.

The lower‑level function **`createAppointment()`** exists only to persist already‑validated data.

If you remember nothing else, remember this:

> *If you are creating an appointment, you call the canonical path.*

---

## What Exists vs. What Does NOT (Important)

### Exists in Phase 1
- Canonical appointment write path
- Availability blocks (read‑only)
- Booking UI shell
- API + agent entry points

### Does NOT Exist Yet (By Design)
- Service creation UI
- Provider creation UI
- Customer admin UI
- Business onboarding

Those are **later epics**. Phase 1 is allowed to be manual.

---

## How Appointments Are Created (Authoritative Flow)

```
UI / API / Agent
        ↓
createCanonicalAppointment()
        ↓
• validate input
• enforce region
• verify service + provider
• create customer
        ↓
createAppointment()
        ↓
Supabase RPC (create_appointment)
```

This is the only supported flow.

---

## How to Test Appointments Right Now

Because onboarding UIs do not exist yet, **testing is manual**. This is expected.

### Step 1 — Manually Seed Required Data (Supabase)

You must manually create:

1. **Business**
2. **Service** (active)
3. **Provider (staff)**
4. **Availability blocks**

Use the Supabase dashboard or SQL editor.

Minimum required relationships:
- Service.business_id === Provider.business_id
- All records share the same region_code

---

### Step 2 — Create Availability Blocks

Availability blocks must include:
- staff_id
- business_id
- day_of_week (`0=Sun ... 6=Sat`, UTC)
- start_time / end_time (`time`, UTC, e.g. `14:00:00` to `15:00:00`)
- capacity (>= 1)

These blocks are what the booking UI renders.

If availability has no `staff_id`, booking will be blocked.

---

### Step 3 — Test via API (Recommended First)

This bypasses UI uncertainty and proves the system works.

**POST `/api/appointments`**

```json
{
  "serviceId": "<service-id>",
  "providerId": "<staff-id>",
  "regionCode": "<REGION>",
  "startTime": "2025-03-20T14:00:00Z",
  "endTime": "2025-03-20T15:00:00Z",
  "customerName": "Test User",
  "customerEmail": "test@example.com"
}
```

If this succeeds:
- canonical validation works
- customer creation works
- appointment persistence works

If this fails, the error is authoritative.

---

### Step 4 — Test via Booking UI

Once services + availability exist:

1. Select service
2. Select slot (must include provider)
3. Enter customer details
4. Confirm booking

This path calls the same canonical logic.

---

## Common Confusions (Read This Once)

### “Why can’t I select a service?”
Because services are **not created yet**. This is expected. Seed them manually.

### “Why doesn’t customer creation have a UI?”
Because customers are created *implicitly* during booking in Phase 1.

### “Should this already be automated?”
No. Phase 1 optimizes for correctness, not convenience.

---

## Rules for Contributors

- Never call `createAppointment()` directly from UI, API routes, or agents
- Always enforce region consistency
- Never delete appointments (use states later)
- Prefer explicit errors over silent failures

---

## Phase Boundaries (For Sanity)

If you are about to add:
- service creation UI
- provider onboarding
- calendars
- payments
- AI booking logic

You are in the **wrong epic**.

Close this document. Check Jira.

---

**This HOW‑TO exists to protect the system from cleverness.**

Cleverness comes later.
