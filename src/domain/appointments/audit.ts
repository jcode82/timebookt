import { getSupabaseAdmin } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { Json } from "../../../supabase/types";

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
