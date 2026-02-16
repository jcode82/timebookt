import { getSupabaseAdmin } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import type { Json, Tables } from "../../../supabase/types";

export type AppointmentAuditActorType = "system" | "user" | "staff" | "ai";
export type AppointmentAuditEventType =
  | "created"
  | "confirmed"
  | "reminded"
  | "cancelled"
  | "rescheduled";

export type AppointmentAuditLogInput = {
  appointmentId: string;
  eventType: AppointmentAuditEventType;
  actorType: AppointmentAuditActorType;
  actorId?: string | null;
  occurredAt?: Date;
  metadata?: Json | null;
  supabase?: ReturnType<typeof getSupabaseAdmin>;
};

export type AppointmentAuditLogRow = Tables<"appointment_audit_logs">;

export async function logAppointmentAuditEvent(input: AppointmentAuditLogInput): Promise<void> {
  const supabase = input.supabase ?? getSupabaseAdmin();
  try {
    const { error } = await supabase.from(TABLES.appointmentAuditLogs).insert({
      appointment_id: input.appointmentId,
      event_type: input.eventType,
      occurred_at: (input.occurredAt ?? new Date()).toISOString(),
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      metadata: input.metadata ?? null,
    });

    if (error) {
      console.error("appointment.audit_log_failed", {
        error,
        appointmentId: input.appointmentId,
        eventType: input.eventType,
      });
    }
  } catch (error) {
    console.error("appointment.audit_log_failed", {
      error,
      appointmentId: input.appointmentId,
      eventType: input.eventType,
    });
  }
}

export async function listAppointmentAuditLogsForSupport(input: {
  appointmentId: string;
  limit?: number;
  supabase?: ReturnType<typeof getSupabaseAdmin>;
}): Promise<AppointmentAuditLogRow[]> {
  const supabase = input.supabase ?? getSupabaseAdmin();
  const limit = input.limit ?? 100;

  const { data, error } = await supabase
    .from(TABLES.appointmentAuditLogs)
    .select("*")
    .eq("appointment_id", input.appointmentId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new DomainError("Unable to load appointment audit logs", {
      error,
      appointmentId: input.appointmentId,
    });
  }

  return (data ?? []) as AppointmentAuditLogRow[];
}
