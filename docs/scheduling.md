# Scheduling Semantics (Current State)

This document records the current, authoritative scheduling behavior in TimeBookt as of TBKT-73.

## Decision

Availability blocks are interpreted as **recurring weekly rules**.
Availability exceptions are interpreted as **date-specific overrides**.

Operationally, booking logic matches blocks by:
- `business_id`
- `staff_id`
- `region_code`
- `day_of_week` (UTC, `0=Sunday ... 6=Saturday`)
- appointment time-of-day window contained within block time-of-day window (UTC)

`start_time` / `end_time` are stored as SQL `time` values (UTC time-of-day only).

## Availability Exception Semantics

An availability exception defines a provider-specific override for one UTC date:
- The provider (`staff_id`) and tenant scope (`business_id`, `region_code`)
- A specific UTC date (`exception_date`)
- Whether the provider is closed for that date (`is_closed`)
- An optional replacement time window (`start_time`, `end_time`) for open dates
- A replacement capacity value (`capacity`)

When an exception exists for a provider/date, it takes precedence over recurring rules:
- Closed exceptions produce no slots and reject bookings/reschedules for that date.
- Open exceptions replace the recurring windows for that date with the exception window and capacity.
- Bookings outside an open exception window are rejected, even if a recurring rule would otherwise match.

## Availability Block Semantics

An availability block defines:
- The provider (`staff_id`) and tenant scope (`business_id`, `region_code`)
- A recurring weekday (`day_of_week`, 0-6 in UTC)
- A recurring daily window (`start_time` time-of-day to `end_time` time-of-day in UTC)
- A capacity value (`capacity`)

Capacity is interpreted per overlapping appointment count, not as a pre-generated inventory of fixed seats.

`day_of_week` is derived from appointment start time in UTC via `extract(dow from <timestamp> at time zone 'utc')` in RPCs, and from `Date.getUTCDay()` in application slot generation.

## Capacity And Overlap Invariants

Current invariants enforced by RPC and slot generation:

- Overlap uses half-open ranges: `[start_time, end_time)`.
- Two appointments overlap when `existing.start < candidate.end` and `existing.end > candidate.start`.
- Canceled appointments do not count toward overlap.
- Effective capacity for a matched block is `max(coalesce(capacity, 1), 1)`.
- Effective capacity for a matched exception is `max(coalesce(capacity, 1), 1)`.
- A booking/reschedule is rejected when `overlap_count >= effective_capacity`.
- If overlap is below capacity, booking/reschedule is allowed.

### No-Matching-Block Behavior (Current)

If no availability block matches, booking and reschedule logic falls back to capacity `1` (with advisory lock), rather than rejecting as "outside availability".

This means availability blocks currently act as a **capacity policy source**, not a hard allowlist.
This is intentional for now as legacy/migration-safe behavior during semantics normalization.

This fallback applies only when there is no date exception. If a date exception exists, the exception is the hard allowlist for that provider/date.

## Slot Picker Semantics (`getProviderAvailabilityForDate`)

For a given UTC date:
- Select the date exception for the provider/date, if one exists.
- If the exception is closed, return no slots.
- If the exception is open, use only the exception's replacement window and capacity.
- If no exception exists, select blocks by exact `day_of_week` match.
- Project each block's time-of-day onto that date.
- Generate 30-minute slots inside each block window.
- Count overlapping non-canceled appointments for each slot.
- Keep slot only when `overlap_count < block_capacity`.
- Dedupe and sort slots ascending.

## Override / Conflict Semantics

When multiple blocks match the same provider/day/time window, booking RPCs select one block using:
- `ORDER BY ab.created_at DESC, ab.start_time DESC LIMIT 1`

This is the current override stabilizer, intended to prefer a "newer" rule when multiple rows could match.
For current behavior, "newer" means **most recent `created_at`**, with `start_time DESC` as a deterministic tie-breaker.

## Current Stabilizers

- **Rule tie-breaker:** when multiple rules match, RPCs select the most recent row using `ORDER BY created_at DESC, start_time DESC LIMIT 1`.
- **Exception precedence:** an exception row replaces recurring rules for that provider/date.
- **Advisory lock fallback:** when no rule matches, lock per provider+UTC-date to reduce race conditions while using default capacity `1`.

## Known Limitations

- `day_of_week` and time comparisons are UTC-based; business timezone is not applied in availability matching.
- No hard "outside availability" rejection when no block matches; default capacity `1` still allows booking if no overlap.
- Slot generation is fixed to 30-minute increments and may not align with all service durations.
- Cross-midnight recurring windows are not modeled explicitly (single-day projection logic).

## Source Of Truth (Code Paths)

- Slot generation and client-facing availability:
  - `src/domain/appointments/actions.ts` (`getProviderAvailabilityForDate`)
- Booking and reschedule capacity enforcement:
  - `supabase/migrations/20260220_add_availability_exceptions.sql`
- Capacity/overlap tests:
  - `src/domain/appointments/__tests__/availabilitySlots.test.ts`
  - `docs/testing/manual/TBKT-69-capacity-overlaps.md`
