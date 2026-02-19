# Scheduling Semantics (Current State)

This document records the current, authoritative scheduling behavior in TimeBookt as of TBKT-71.

## Decision

Availability blocks are interpreted as **recurring weekly rules**.

Operationally, booking logic matches blocks by:
- `business_id`
- `staff_id`
- `region_code`
- `day_of_week` (UTC, `0=Sunday ... 6=Saturday`)
- appointment time-of-day window contained within block time-of-day window (UTC)

`start_time` / `end_time` are stored as full timestamps but are treated as time-of-day carriers for weekly matching.

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
- A booking/reschedule is rejected when `overlap_count >= effective_capacity`.
- If overlap is below capacity, booking/reschedule is allowed.

### No-Matching-Block Behavior (Current)

If no availability block matches, booking and reschedule logic falls back to capacity `1` (with advisory lock), rather than rejecting as "outside availability".

This means availability blocks currently act as a **capacity policy source**, not a hard allowlist.
This is intentional for now as legacy/migration-safe behavior during semantics normalization.

## Slot Picker Semantics (`getProviderAvailabilityForDate`)

For a given UTC date:
- Select blocks by exact `day_of_week` match.
- Project each block's time-of-day onto that date.
- Generate 30-minute slots inside each block window.
- Count overlapping non-canceled appointments for each slot.
- Keep slot only when `overlap_count < block_capacity`.
- Dedupe and sort slots ascending.

## Override / Conflict Semantics

When multiple blocks match the same provider/day/time window, booking RPCs select one block using:
- `ORDER BY ab.start_time DESC LIMIT 1`

This is the current override stabilizer, intended to prefer a "newer" rule when multiple rows could match.
For current behavior, "newer" means **higher `start_time` value** (not `created_at` or explicit rule version).
`created_at` exists on `availability_blocks` but is not used for override selection today.

## Current Stabilizers (Temporary)

The following are temporary stabilizers to reduce ambiguity until schema/semantics are normalized:

- **DESC block selection stabilizer:** `ORDER BY ab.start_time DESC LIMIT 1` when multiple rules match.
- **Date-match stabilizer in RPCs:** `(ab.start_time at time zone 'utc')::date = (appointment_start at time zone 'utc')::date` to avoid selecting blocks from a different UTC calendar date that share weekday/time.
- **Advisory lock fallback:** when no block matches, lock per provider+UTC-date to reduce race conditions while using default capacity `1`.

These are implementation stabilizers, not final domain semantics.

## Known Limitations

- Stored full timestamps vs recurring intent: data model still mixes absolute timestamps with weekly-rule behavior.
- `day_of_week` and time comparisons are UTC-based; business timezone is not applied in availability matching.
- No hard "outside availability" rejection when no block matches; default capacity `1` still allows booking if no overlap.
- Reschedule overlap query currently scopes by `staff_id + region_code` (not `business_id`), which can be a cross-tenant risk if provider IDs are not globally isolated.
- Slot generation is fixed to 30-minute increments and may not align with all service durations.
- Cross-midnight recurring windows are not modeled explicitly (single-day projection logic).

## Source Of Truth (Code Paths)

- Slot generation and client-facing availability:
  - `src/domain/appointments/actions.ts` (`getProviderAvailabilityForDate`)
- Booking and reschedule capacity enforcement:
  - `supabase/migrations/20250317_fix_capacity_block_date_match.sql`
- Capacity/overlap tests:
  - `src/domain/appointments/__tests__/availabilitySlots.test.ts`
  - `docs/testing/manual/TBKT-69-capacity-overlaps.md`
