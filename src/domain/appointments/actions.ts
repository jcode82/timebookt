import { DASHBOARD_LIMITS } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { REGION } from "@/lib/env";
import type { Tables, TablesInsert, TablesUpdate } from "../../../supabase/types";
import type {
  AppointmentRecord,
  AvailabilityBlock,
  AvailabilityRequest,
  CancelAppointmentInput,
  CreateAppointmentInput,
} from "./types";

const APPOINTMENTS_TABLE = "appointments" as const;
const AVAILABILITY_TABLE = "availability_blocks" as const;

const mapAppointment = (row: Tables<"appointments">): AppointmentRecord => ({
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

const mapAvailability = (row: Tables<"availability_blocks">): AvailabilityBlock => ({
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

  const payload: TablesInsert<"appointments"> = {
    business_id: input.businessId,
    customer_id: input.customerId,
    service_id: input.serviceId,
    staff_id: input.staffId,
    region_code: REGION,
    start_time: input.startTime,
    end_time: input.endTime,
    notes: input.notes,
  };

  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
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

  const payload: TablesUpdate<"appointments"> = {
    status: "canceled",
    cancellation_reason: input.cancellationReason ?? "canceled-by-admin",
  };

  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .update(payload)
    .eq("id", input.appointmentId)
    .eq("region_code", REGION)
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
    .from(APPOINTMENTS_TABLE)
    .select()
    .eq("business_id", businessId)
    .eq("region_code", REGION)
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
    .from(AVAILABILITY_TABLE)
    .select()
    .eq("business_id", request.businessId)
    .eq("region_code", REGION)
    .gte("start_time", request.startDate)
    .lte("end_time", request.endDate);

  if (error) {
    throw new DomainError("Unable to load availability", { error, request });
  }

  return (data ?? []).map(mapAvailability);
}
