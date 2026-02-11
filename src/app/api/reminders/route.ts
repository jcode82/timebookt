import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import { REGION } from "@/lib/env";
import { sendAppointmentReminderEmail } from "@/lib/email/sendAppointmentReminderEmail";
import { rpcCall } from "@/lib/supabase/rpc";
import { logAppointmentAuditEvent } from "@/domain/appointments/audit";
import { filterRemindableAppointments } from "./utils";
import { processAppointmentReminder } from "./processor";
import type { Json } from "../../../../supabase/types";

const DEFAULT_REMINDER_HOURS = 24;
const REMINDER_WINDOW_MINUTES = 15;
const REMINDER_CHANNEL = "email";
const MAX_ATTEMPTS = 3;
const BASE_RETRY_MINUTES = 5;
const MAX_RETRY_MINUTES = 60;
const LOCK_TIMEOUT_SECONDS = 600;

const getReminderWindow = (hours: number) => {
  const now = new Date();
  const target = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const windowStart = new Date(target.getTime() - REMINDER_WINDOW_MINUTES * 60 * 1000);
  const windowEnd = new Date(target.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);
  return { windowStart, windowEnd };
};

const getReminderHours = () => {
  const value = process.env.REMINDER_LEAD_HOURS;
  const parsed = value ? Number(value) : DEFAULT_REMINDER_HOURS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REMINDER_HOURS;
};

const getReminderType = (hoursBefore: number) => `lead_${hoursBefore}h`;

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
};

async function runReminderJob(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobRunId = crypto.randomUUID();
  const hoursBefore = getReminderHours();
  const { windowStart, windowEnd } = getReminderWindow(hoursBefore);
  const reminderType = getReminderType(hoursBefore);
  const supabase = getSupabaseAdmin();

  const { data: appointments, error } = await supabase
    .from(TABLES.appointments)
    .select("id, business_id, service_id, staff_id, customer_id, start_time, status")
    .eq("region_code", REGION)
    .eq("status", "scheduled")
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (error) {
    console.error("reminder.fetch_failed", { error });
    return NextResponse.json({ error: "Unable to load appointments" }, { status: 500 });
  }

  const appointmentRows = (appointments ?? []) as Array<{
    id: string;
    business_id: string;
    service_id: string;
    staff_id: string | null;
    customer_id: string;
    start_time: string;
    status: string;
  }>;

  const results = await Promise.all(
    filterRemindableAppointments(appointmentRows).map(async (appointment) => {
      return processAppointmentReminder(
        {
          upsertEvent: async (input) =>
            rpcCall(supabase, "create_appointment_reminder_event", {
              appointment_id: input.appointmentId,
              reminder_type: input.reminderType,
              channel: input.channel,
              scheduled_for: input.scheduledFor,
              meta: input.meta,
            }),
          claimEvent: async (input) =>
            rpcCall(supabase, "claim_appointment_reminder_event", {
              reminder_event_id: input.reminderEventId,
              lock_timeout_seconds: input.lockTimeoutSeconds,
              now_ts: input.now.toISOString(),
              max_attempts: input.maxAttempts,
            }),
          markSent: async (input) => {
            const { data, error } = await supabase
              .from("appointment_reminder_events")
              .update({
                status: "sent",
                sent_at: input.sentAt.toISOString(),
                provider_message_id: input.providerMessageId,
                updated_at: input.sentAt.toISOString(),
              })
              .eq("id", input.reminderEventId)
              .eq("status", "sending")
              .select("*")
              .maybeSingle();
            return { data: data ?? null, error };
          },
          markFailed: async (input) => {
            const { data, error } = await supabase
              .from("appointment_reminder_events")
              .update({
                status: input.status,
                next_attempt_at: input.nextAttemptAt?.toISOString() ?? null,
                last_error: input.error as Json,
                updated_at: new Date().toISOString(),
              })
              .eq("id", input.reminderEventId)
              .eq("status", "sending")
              .select("*")
              .maybeSingle();
            return { data: data ?? null, error };
          },
          loadLookups: async ({ appointment: appt }) => {
            const [serviceRes, providerRes, customerRes] = await Promise.all([
              supabase
                .from(TABLES.services)
                .select("id, name")
                .eq("id", appt.service_id)
                .maybeSingle(),
              supabase
                .from(TABLES.staff)
                .select("id, full_name")
                .eq("id", appt.staff_id ?? "")
                .maybeSingle(),
              supabase
                .from(TABLES.customers)
                .select("id, full_name, email")
                .eq("id", appt.customer_id)
                .maybeSingle(),
            ]);

            if (serviceRes.error || providerRes.error || customerRes.error) {
              return {
                data: null,
                error: {
                  serviceError: serviceRes.error,
                  providerError: providerRes.error,
                  customerError: customerRes.error,
                },
              };
            }

            if (!serviceRes.data || !customerRes.data) {
              return { data: null, error: { message: "lookup_missing" } };
            }

            return {
              data: {
                service: serviceRes.data as { id: string; name: string },
                provider: providerRes.data as { id: string; full_name: string | null } | null,
                customer: customerRes.data as { id: string; full_name: string; email: string },
              },
              error: null,
            };
          },
          sendReminder: sendAppointmentReminderEmail,
          now: () => new Date(),
          logger: console,
          logAuditEvent: async (input) => {
            await logAppointmentAuditEvent({
              appointmentId: input.appointmentId,
              eventType: "reminded",
              actorType: "system",
              actorId: null,
              occurredAt: input.occurredAt,
              metadata: input.metadata,
              supabase,
            });
          },
          jobRunId,
          region: REGION,
          hoursBefore,
          reminderType,
          channel: REMINDER_CHANNEL,
          maxAttempts: MAX_ATTEMPTS,
          lockTimeoutSeconds: LOCK_TIMEOUT_SECONDS,
          baseRetryMinutes: BASE_RETRY_MINUTES,
          maxRetryMinutes: MAX_RETRY_MINUTES,
        },
        appointment,
      );
    }),
  );

  const summary = results.reduce((acc: Record<string, number>, entry) => {
    acc[entry.status] = (acc[entry.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    jobRunId,
    hoursBefore,
    reminderType,
    channel: REMINDER_CHANNEL,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    processed: results.length,
    summary,
    results,
  });
}

export async function GET(request: Request) {
  return runReminderJob(request);
}

export async function POST(request: Request) {
  return runReminderJob(request);
}
