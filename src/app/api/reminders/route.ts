import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import { REGION } from "@/lib/env";
import { sendAppointmentReminderEmail } from "@/lib/email/sendAppointmentReminderEmail";
import { rpcCall } from "@/lib/supabase/rpc";

const DEFAULT_REMINDER_HOURS = 24;
const REMINDER_WINDOW_MINUTES = 15;

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

const computeScheduledForIso = (appointmentStartIso: string, hoursBefore: number) => {
  const apptStart = new Date(appointmentStartIso);
  const ms = apptStart.getTime() - hoursBefore * 60 * 60 * 1000;
  return new Date(ms).toISOString();
};

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

  const hoursBefore = getReminderHours();
  const { windowStart, windowEnd } = getReminderWindow(hoursBefore);
  const reminderType = getReminderType(hoursBefore);
  const supabase = getSupabaseAdmin();

  const { data: appointments, error } = await supabase
    .from(TABLES.appointments)
    .select("id, service_id, staff_id, customer_id, start_time")
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
    service_id: string;
    staff_id: string | null;
    customer_id: string;
    start_time: string;
  }>;

  const results = await Promise.all(
    appointmentRows.map(async (appointment) => {
      const scheduledFor = computeScheduledForIso(appointment.start_time, hoursBefore);

      const { error: eventError } = await rpcCall(
        supabase,
        "create_appointment_reminder_event",
        {
          appointment_id: appointment.id,
          reminder_type: reminderType,
          scheduled_for: scheduledFor,
          meta: { hoursBefore, region: REGION },
        },
      );

      if (eventError) {
        const message = String((eventError as { message?: string }).message ?? "").toLowerCase();
        const code = String((eventError as { code?: string }).code ?? "");
        const isUnique =
          code === "23505" || message.includes("duplicate") || message.includes("unique");

        if (isUnique) {
          console.info("reminder.skip_already_sent", {
            appointmentId: appointment.id,
            reminderType,
            scheduledFor,
          });
          return { appointmentId: appointment.id, status: "skipped_already_sent" };
        }

        console.error("reminder.event_insert_failed", { appointmentId: appointment.id, error: eventError });
        return { appointmentId: appointment.id, status: "event_insert_failed" };
      }

      const [serviceRes, providerRes, customerRes] = await Promise.all([
        supabase
          .from(TABLES.services)
          .select("id, name")
          .eq("id", appointment.service_id)
          .maybeSingle(),
        supabase
          .from(TABLES.staff)
          .select("id, full_name")
          .eq("id", appointment.staff_id ?? "")
          .maybeSingle(),
        supabase
          .from(TABLES.customers)
          .select("id, full_name, email")
          .eq("id", appointment.customer_id)
          .maybeSingle(),
      ]);

      if (serviceRes.error || providerRes.error || customerRes.error) {
        console.error("reminder.lookup_failed", {
          appointmentId: appointment.id,
          serviceError: serviceRes.error,
          providerError: providerRes.error,
          customerError: customerRes.error,
        });
        return { appointmentId: appointment.id, status: "lookup_failed" };
      }

      if (!serviceRes.data || !customerRes.data) {
        console.error("reminder.lookup_missing", { appointmentId: appointment.id });
        return { appointmentId: appointment.id, status: "lookup_missing" };
      }

      const serviceRow = serviceRes.data as { id: string; name: string };
      const providerRow = providerRes.data as { id: string; full_name: string | null } | null;
      const customerRow = customerRes.data as { id: string; full_name: string; email: string };

      try {
        await sendAppointmentReminderEmail({
          to: customerRow.email,
          service: serviceRow.name,
          provider: providerRow?.full_name ?? "Provider",
          startTime: appointment.start_time,
          hoursBefore,
        });
        console.info("booking.reminder_sent", {
          appointmentId: appointment.id,
          reminderType,
          scheduledFor,
        });
        return { appointmentId: appointment.id, status: "sent" };
      } catch (sendError) {
        console.error("booking.reminder_failed", {
          appointmentId: appointment.id,
          error: sendError,
          reminderType,
          scheduledFor,
        });
        return { appointmentId: appointment.id, status: "failed" };
      }
    }),
  );

  const summary = results.reduce((acc: Record<string, number>, entry) => {
    acc[entry.status] = (acc[entry.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    hoursBefore,
    reminderType,
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
