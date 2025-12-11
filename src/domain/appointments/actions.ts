import { DASHBOARD_LIMITS, TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "../../../supabase/types";
import type {
  AppointmentRecord,
  AvailabilityBlock,
  AvailabilityRequest,
  CancelAppointmentInput,
  CreateAppointmentInput,
} from "./types";

const mapAppointment = (row: Tables<typeof TABLES.appointments>): AppointmentRecord => ({
  id: row.id,
  businessId: row.business_id,
  customerId: row.customer_id,
  serviceId: row.service_id,
  staffId: row.staff_id,
  startTime: row.start_time,
  endTime: row.end_time,
  status: row.status as AppointmentRecord["status"],
  notes: row.notes,
  cancellationReason: row.cancellation_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAvailability = (
  row: Tables<typeof TABLES.availabilityBlocks>,
): AvailabilityBlock => ({
  id: row.id,
  businessId: row.business_id,
  staffId: row.staff_id,
  dayOfWeek: row.day_of_week,
  startTime: row.start_time,
  endTime: row.end_time,
  capacity: row.capacity,
});

export async function createAppointment(input: CreateAppointmentInput): Promise<AppointmentRecord> {
  const supabase = getSupabaseAdmin();

  const payload: TablesInsert<typeof TABLES.appointments> = {
    business_id: input.businessId,
    customer_id: input.customerId,
    service_id: input.serviceId,
    staff_id: input.staffId,
    start_time: input.startTime,
    end_time: input.endTime,
    notes: input.notes,
  };

  const { data, error } = await supabase
    .from(TABLES.appointments)
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new DomainError("Unable to create appointment", { error, input });
  }

  return mapAppointment(data);
}

export async function cancelAppointment(input: CancelAppointmentInput): Promise<AppointmentRecord> {
  const supabase = getSupabaseAdmin();

  const payload: TablesUpdate<typeof TABLES.appointments> = {
    status: "canceled",
    cancellation_reason: input.cancellationReason ?? "canceled-by-admin",
  };

  const { data, error } = await supabase
    .from(TABLES.appointments)
    .update(payload)
    .eq("id", input.appointmentId)
    .select()
    .single();

  if (error || !data) {
    throw new DomainError("Unable to cancel appointment", { error, input });
  }

  return mapAppointment(data);
}

export async function listAppointmentsForBusiness(
  businessId: string,
  limit = DASHBOARD_LIMITS.appointments,
): Promise<AppointmentRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.appointments)
    .select()
    .eq("business_id", businessId)
    .order("start_time", { ascending: true })
    .limit(limit);

  if (error) {
    throw new DomainError("Unable to load appointments", { error, businessId });
  }

  return (data ?? []).map(mapAppointment);
}

export async function getAvailability(
  request: AvailabilityRequest,
): Promise<AvailabilityBlock[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.availabilityBlocks)
    .select()
    .eq("business_id", request.businessId)
    .gte("start_time", request.startDate)
    .lte("end_time", request.endDate);

  if (error) {
    throw new DomainError("Unable to load availability", { error, request });
  }

  return (data ?? []).map(mapAvailability);
}
