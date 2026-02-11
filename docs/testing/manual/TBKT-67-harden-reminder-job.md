Manual Test Plan — TBKT-67 Harden background job execution
Purpose

Validate `/api/reminders` cron auth, window selection, DB-level idempotency/dedupe, successful send flow, and permanent failure handling when provider config is missing.

Auth

curl -s "http://localhost:3000/api/reminders" \
  -H "authorization: Bearer $CRON_SECRET" | jq

Test 1 — Happy path + idempotency
Setup

Ensure Resend config is present in `.env.local` (API key, from address, etc.).

Ensure appointment is within job window:

Run route once to capture `windowStart`/`windowEnd`

Update appointment `start_time` to a timestamp inside that window.

Run

Call the route once → expect `summary.sent = 1`

Call the route again → expect `summary.skipped_already_sent = 1`

DB verification

Latest `appointment_reminder_events` row for appointment:

`status = sent`

`attempt_count = 1`

`provider_message_id` populated

`sent_at` populated

Second run should not create another sent row for the same idempotency key.

Test 2 — Permanent failure when provider config missing
Setup

Remove Resend config from `.env.local` and restart dev server.

Hit route once to capture `windowStart`/`windowEnd`.

Update appointment `start_time` to a timestamp inside that window.

Run

Call route → expect `summary.failed = 1`

Expected server log

`reminder.send_failed` with:

`error.name = ProviderConfigurationError`

`outcome = failed_permanent`

`next_attempt_at = null`

DB verification

Latest reminder event row:

`status = failed`

`attempt_count` incremented

`next_attempt_at = null`

`provider_message_id = null`

`last_error` populated

Gotcha / Note

The job only processes appointments in the computed window (`now + lead_hours ± 15m`). If the appointment is outside the window, the route returns `processed: 0` and no reminder send attempt occurs.
