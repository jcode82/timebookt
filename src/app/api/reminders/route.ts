import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import { REGION } from "@/lib/env";
import { sendAppointmentReminderEmail } from "@/lib/email/sendAppointmentReminderEmail";

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

const isAuthorized = (request: Request) => {
  const secret = process.env.REMINDER_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoursBefore = getReminderHours();
  const { windowStart, windowEnd } = getReminderWindow(hoursBefore);
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

  const appointmentRows = (appointments ?? []) as Array<{ id: string; service_id: string; staff_id: string | null; customer_id: string; start_time: string }>;

  const results = await Promise.all(
    appointmentRows.map(async (appointment) => {
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
        console.info("booking.reminder_sent", { appointmentId: appointment.id });
        return { appointmentId: appointment.id, status: "sent" };
      } catch (sendError) {
        console.error("booking.reminder_failed", { appointmentId: appointment.id, error: sendError });
        return { appointmentId: appointment.id, status: "failed" };
      }
    }),
  );

  return NextResponse.json({
    hoursBefore,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    processed: results.length,
    results,
  });
}
