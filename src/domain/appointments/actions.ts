import { DASHBOARD_LIMITS, TABLES } from "@/lib/constants";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { createCustomer } from "@/domain/customers";
import { rpcCall } from "@/lib/supabase/rpc";
import { REGION } from "@/lib/env";
import type { Tables, TablesInsert, TablesUpdate } from "../../../supabase/types";
import type {
  AppointmentRecord,
  AvailabilityBlock,
  AvailabilityRequest,
  CancelAppointmentInput,
  CanonicalAppointmentInput,
  CreateAppointmentInput,
} from "./types";

// const APPOINTMENTS_TABLE = "appointments" as const;
// const AVAILABILITY_TABLE = "availability_blocks" as const;

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

const canonicalAppointmentSchema = z
  .object({
    serviceId: z.string().min(1),
    providerId: z.string().min(1),
    regionCode: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    customerName: z.string().min(2),
    customerEmail: z.string().email(),
    customerPhone: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (value) => new Date(value.endTime).getTime() > new Date(value.startTime).getTime(),
    {
      message: "endTime must be after startTime",
      path: ["endTime"],
    },
  );

const mapAvailability = (row: Tables<"availability_blocks">): AvailabilityBlock => ({
  id: row.id,
  businessId: row.business_id,
  staffId: row.staff_id,
  dayOfWeek: row.day_of_week,
  startTime: row.start_time,
  endTime: row.end_time,
  capacity: row.capacity,
});

export async function createCanonicalAppointment(
  input: CanonicalAppointmentInput,
): Promise<AppointmentRecord> {
  const parsed = canonicalAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    console.error("Invalid appointment input", {
      issues: parsed.error.flatten(),
      input,
    });
    throw new DomainError("Invalid appointment input", { issues: parsed.error.flatten() });
  }

  const payload = parsed.data;
  if (payload.regionCode !== REGION) {
    console.error("Region mismatch for appointment", {
      regionCode: payload.regionCode,
      expectedRegion: REGION,
    });
    throw new DomainError("Region mismatch for appointment", {
      regionCode: payload.regionCode,
      expectedRegion: REGION,
    });
  }

  const supabase = getSupabaseAdmin();
  const [serviceRes, providerRes] = await Promise.all([
    supabase
      .from(TABLES.services)
      .select("id, business_id, region_code, is_active")
      .eq("id", payload.serviceId)
      .eq("region_code", payload.regionCode)
      .maybeSingle(),
    supabase
      .from(TABLES.staff)
      .select("id, business_id, region_code")
      .eq("id", payload.providerId)
      .eq("region_code", payload.regionCode)
      .maybeSingle(),
  ]);

  if (serviceRes.error || !serviceRes.data) {
    console.error("Service not found for appointment", {
      error: serviceRes.error,
      serviceId: payload.serviceId,
    });
    throw new DomainError("Service not found for appointment", {
      error: serviceRes.error,
      serviceId: payload.serviceId,
    });
  }

  const serviceRecord = serviceRes.data as Tables<typeof TABLES.services>;
  if (!serviceRecord.is_active) {
    console.error("Service inactive for appointment", { serviceId: payload.serviceId });
    throw new DomainError("Service is inactive", { serviceId: payload.serviceId });
  }

  if (providerRes.error || !providerRes.data) {
    console.error("Provider not found for appointment", {
      error: providerRes.error,
      providerId: payload.providerId,
    });
    throw new DomainError("Provider not found for appointment", {
      error: providerRes.error,
      providerId: payload.providerId,
    });
  }

  const providerRecord = providerRes.data as Tables<typeof TABLES.staff>;

  if (serviceRecord.business_id !== providerRecord.business_id) {
    console.error("Provider does not match service business", {
      serviceId: payload.serviceId,
      providerId: payload.providerId,
    });
    throw new DomainError("Provider does not match service", {
      serviceId: payload.serviceId,
      providerId: payload.providerId,
    });
  }

  try {
    const customer = await createCustomer({
      businessId: serviceRecord.business_id,
      name: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerPhone,
    });

    return await createAppointment({
      businessId: serviceRecord.business_id,
      customerId: customer.id,
      serviceId: payload.serviceId,
      staffId: payload.providerId,
      startTime: payload.startTime,
      endTime: payload.endTime,
      notes: payload.notes,
    });
  } catch (error) {
    console.error("Unable to create appointment", { error, input: payload });
    if (error instanceof DomainError) {
      throw error;
    }
    throw new DomainError("Unable to create appointment", { error, input: payload });
  }
}

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

  const { data, error } = await rpcCall<Tables<"appointments">>(supabase, "create_appointment", {
    business_id: payload.business_id,
    customer_id: payload.customer_id,
    service_id: payload.service_id,
    staff_id: payload.staff_id ?? null,
    region_code: payload.region_code ?? REGION,
    start_time: payload.start_time,
    end_time: payload.end_time,
    notes: payload.notes ?? null,
  });

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

  const { data, error } = await rpcCall<Tables<"appointments">>(supabase, "cancel_appointment", {
    appointment_id: input.appointmentId,
    region_code: REGION,
    cancellation_reason: payload.cancellation_reason,
  });

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
    .from("appointments")
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
    .from("availability_blocks")
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
