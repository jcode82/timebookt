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
  BookingStatusDetails,
  CancelAppointmentInput,
  CanonicalAppointmentInput,
  CreateAppointmentInput,
  ProviderAvailabilityRequest,
  ProviderAvailabilitySlot,
  RescheduleAppointmentInput,
} from "./types";
import { dedupeAndSortSlots, parseTimestamp } from "./utils";

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

const providerAvailabilitySchema = z.object({
  businessId: z.string().min(1),
  providerId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

const SLOT_MINUTES = 30;

const buildDayRange = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { dayStart, dayEnd, dayOfWeek: dayStart.getUTCDay() };
};

const applyTimeToDate = (dateBase: Date, timeIso: string) => {
  const time = parseTimestamp(timeIso);
  if (!time) {
    return null;
  }
  return new Date(
    Date.UTC(
      dateBase.getUTCFullYear(),
      dateBase.getUTCMonth(),
      dateBase.getUTCDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      0,
      0,
    ),
  );
};

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

  if (error) {
    if (error.code === "23P01") {
      throw new DomainError("Appointment overlaps an existing booking", { error, input });
    }
    throw new DomainError("Unable to create appointment", { error, input });
  }

  if (!data) {
    throw new DomainError("Unable to create appointment", { error, input });
  }

  return mapAppointment(data);
}

export async function cancelAppointment(input: CancelAppointmentInput): Promise<AppointmentRecord> {
  const supabase = getSupabaseAdmin();

  const payload: TablesUpdate<"appointments"> = {
    status: "canceled",
    cancellation_reason: input.cancellationReason ?? null,
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

export async function rescheduleAppointment(
  input: RescheduleAppointmentInput,
): Promise<AppointmentRecord> {
  const start = parseTimestamp(input.startTime);
  const end = parseTimestamp(input.endTime);

  if (!start || !end) {
    throw new DomainError("Invalid appointment time", { input });
  }

  if (end.getTime() <= start.getTime()) {
    throw new DomainError("endTime must be after startTime", { input });
  }

  if (start.getTime() < Date.now()) {
    throw new DomainError("Cannot reschedule into the past", { input });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await rpcCall<Tables<"appointments">>(
    supabase,
    "reschedule_appointment",
    {
      p_appointment_id: input.appointmentId,
      p_region_code: REGION,
      p_new_start_time: input.startTime,
      p_new_end_time: input.endTime,
      p_reason: input.reason ?? null,
      p_source: input.source ?? null,
    },
  );

  if (error) {
    if (error.code === "23P01") {
      throw new DomainError("Appointment overlaps an existing booking", { error, input });
    }
    throw new DomainError("Unable to reschedule appointment", { error, input });
  }

  if (!data) {
    throw new DomainError("Unable to reschedule appointment", { error, input });
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

export async function getBookingStatus(
  appointmentId: string,
): Promise<BookingStatusDetails | null> {
  const supabase = getSupabaseAdmin();
  const appointmentRes = await supabase
    .from(TABLES.appointments)
    .select("id, service_id, staff_id, customer_id, start_time, end_time, status")
    .eq("id", appointmentId)
    .eq("region_code", REGION)
    .maybeSingle();

  if (appointmentRes.error) {
    throw new DomainError("Unable to load booking", { error: appointmentRes.error, appointmentId });
  }

  if (!appointmentRes.data) {
    return null;
  }

  const appointmentRow = appointmentRes.data as Tables<"appointments">;
  const [serviceRes, providerRes, customerRes] = await Promise.all([
    supabase
      .from(TABLES.services)
      .select("id, name")
      .eq("id", appointmentRow.service_id)
      .maybeSingle(),
    supabase
      .from(TABLES.staff)
      .select("id, full_name")
      .eq("id", appointmentRow.staff_id ?? "")
      .maybeSingle(),
    supabase
      .from(TABLES.customers)
      .select("id, full_name, email")
      .eq("id", appointmentRow.customer_id)
      .maybeSingle(),
  ]);

  if (serviceRes.error || !serviceRes.data) {
    throw new DomainError("Unable to load booking service", { error: serviceRes.error, appointmentId });
  }

  if (providerRes.error) {
    throw new DomainError("Unable to load booking provider", { error: providerRes.error, appointmentId });
  }
  if (customerRes.error || !customerRes.data) {
    throw new DomainError("Unable to load booking customer", { error: customerRes.error, appointmentId });
  }

  const serviceRow = serviceRes.data as { id: string; name: string };
  const providerRow = providerRes.data as { id: string; full_name: string | null } | null;
  const customerRow = customerRes.data as { id: string; full_name: string; email: string };

  return {
    appointmentId: appointmentRow.id,
    service: serviceRow.name,
    provider: providerRow?.full_name ?? "",
    startTime: appointmentRow.start_time,
    endTime: appointmentRow.end_time,
    status: appointmentRow.status as BookingStatusDetails["status"],
    customerName: customerRow.full_name,
    customerEmail: customerRow.email,
  };
}

export async function getProviderAvailabilityForDate(
  request: ProviderAvailabilityRequest,
): Promise<ProviderAvailabilitySlot[]> {
  const parsed = providerAvailabilitySchema.safeParse(request);
  if (!parsed.success) {
    console.error("Invalid provider availability request", {
      issues: parsed.error.flatten(),
      request,
    });
    throw new DomainError("Invalid provider availability request", {
      issues: parsed.error.flatten(),
    });
  }

  const { businessId, providerId, date } = parsed.data;
  const { dayStart, dayEnd, dayOfWeek } = buildDayRange(date);
  const supabase = getSupabaseAdmin();

  const [availabilityRes, appointmentsRes] = await Promise.all([
    supabase
      .from(TABLES.availabilityBlocks)
      .select("id, staff_id, day_of_week, start_time, end_time, capacity")
      .eq("staff_id", providerId)
      .eq("business_id", businessId)
      .eq("day_of_week", dayOfWeek)
      .eq("region_code", REGION),
    supabase
      .from(TABLES.appointments)
      .select("id, start_time, end_time")
      .eq("staff_id", providerId)
      .eq("business_id", businessId)
      .neq("status", "canceled")
      .eq("region_code", REGION),
  ]);

  if (availabilityRes.error) {
    throw new DomainError("Unable to load availability", {
      error: availabilityRes.error,
      request,
    });
  }

  if (appointmentsRes.error) {
    throw new DomainError("Unable to load appointments", {
      error: appointmentsRes.error,
      request,
    });
  }

  const availabilityRows = (availabilityRes.data ?? []) as Tables<"availability_blocks">[];
  const appointmentRows = (appointmentsRes.data ?? []) as Tables<"appointments">[];
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  const filteredAppointments = appointmentRows.filter((appt) => {
    const apptStart = parseTimestamp(appt.start_time);
    const apptEnd = parseTimestamp(appt.end_time);
    if (!apptStart || !apptEnd) return false;
    return apptStart.getTime() < dayEndMs && apptEnd.getTime() > dayStartMs;
  });
  const slots: ProviderAvailabilitySlot[] = [];
  const slotMs = SLOT_MINUTES * 60 * 1000;

  availabilityRows.forEach((block) => {
    if (!block.start_time || !block.end_time) return;
    const blockStart = applyTimeToDate(dayStart, block.start_time);
    const blockEnd = applyTimeToDate(dayStart, block.end_time);
    if (!blockStart || !blockEnd) return;
    for (let ts = blockStart.getTime(); ts + slotMs <= blockEnd.getTime(); ts += slotMs) {
      const slotStart = new Date(ts);
      const slotEnd = new Date(ts + slotMs);
      // NOTE: DB currently enforces no-overlap (capacity=1 semantics).
      // When multi-capacity booking is implemented, switch to overlapCount < capacity
      // AND update the create_appointment RPC/constraint accordingly.
      const hasOverlap = filteredAppointments.some((appt) => {
        const apptStart = parseTimestamp(appt.start_time);
        const apptEnd = parseTimestamp(appt.end_time);
        if (!apptStart || !apptEnd) return false;
        return apptStart < slotEnd && apptEnd > slotStart;
      });

      if (!hasOverlap) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }
    }
  });

  return dedupeAndSortSlots(slots);
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
