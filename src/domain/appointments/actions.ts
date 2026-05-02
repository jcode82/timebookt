import { DASHBOARD_LIMITS, TABLES } from "@/lib/constants";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { createCustomer } from "@/domain/customers";
import { rpcCall } from "@/lib/supabase/rpc";
import { REGION } from "@/lib/env";
import type { Tables, TablesInsert, TablesUpdate } from "../../../supabase/types";
import { logAppointmentAuditEvent } from "./audit";
import type {
  AppointmentRecord,
  AvailabilityBlock,
  AvailabilityRequest,
  BookingStatusDetails,
  CancelAppointmentInput,
  CanonicalAppointmentInput,
  CreateAvailabilityBlockInput,
  CreateAppointmentInput,
  DeleteAvailabilityBlockInput,
  ListAppointmentsForBusinessOptions,
  ProviderAvailabilityRequest,
  ProviderAvailabilitySlot,
  RescheduleAppointmentInput,
  UpdateAvailabilityBlockInput,
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

const isCapacityOverlapError = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  if (error.code === "23P01") return true;
  if (error.code !== "P0001") return false;
  return /availability|capacity|overlap/i.test(error.message ?? "");
};

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
    actorType: z.enum(["system", "user", "staff", "ai"]).optional(),
    actorId: z.string().uuid().nullable().optional(),
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
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/.exec(timeIso);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }
  return new Date(
    Date.UTC(
      dateBase.getUTCFullYear(),
      dateBase.getUTCMonth(),
      dateBase.getUTCDate(),
      hours,
      minutes,
      seconds,
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

type SlotAvailabilityWindow = Pick<
  Tables<"availability_blocks">,
  "start_time" | "end_time" | "capacity"
>;

const availabilityTimePattern = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function normalizeAvailabilityTime(value: string, fieldName: "startTime" | "endTime") {
  const match = availabilityTimePattern.exec(value);
  if (!match) {
    throw new DomainError(`Availability ${fieldName} must use HH:mm format`, { value, fieldName });
  }

  return `${match[1]}:${match[2]}:00`;
}

function validateAvailabilityInput(
  input: Pick<CreateAvailabilityBlockInput, "dayOfWeek" | "startTime" | "endTime" | "capacity">,
) {
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new DomainError("Availability day must be between 0 and 6", { input });
  }

  const startTime = normalizeAvailabilityTime(input.startTime, "startTime");
  const endTime = normalizeAvailabilityTime(input.endTime, "endTime");

  if (endTime <= startTime) {
    throw new DomainError("Availability end time must be after start time", { input });
  }

  const capacity = Math.max(input.capacity ?? 1, 1);

  return {
    dayOfWeek: input.dayOfWeek,
    startTime,
    endTime,
    capacity,
  };
}

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

    const appointment = await createAppointment({
      businessId: serviceRecord.business_id,
      customerId: customer.id,
      serviceId: payload.serviceId,
      staffId: payload.providerId,
      startTime: payload.startTime,
      endTime: payload.endTime,
      notes: payload.notes,
    });

    const actorType = payload.actorType ?? "user";
    const actorId = payload.actorId ?? (actorType === "user" ? customer.id : null);

    void logAppointmentAuditEvent({
      appointmentId: appointment.id,
      eventType: "created",
      actorType,
      actorId,
      metadata: {
        business_id: serviceRecord.business_id,
        customer_id: customer.id,
        service_id: payload.serviceId,
        staff_id: payload.providerId,
        start_time: appointment.startTime,
        end_time: appointment.endTime,
      },
    });

    return appointment;
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
    p_business_id: payload.business_id,
    p_customer_id: payload.customer_id,
    p_service_id: payload.service_id,
    p_region_code: payload.region_code ?? REGION,
    p_start_time: payload.start_time,
    p_end_time: payload.end_time,
    p_staff_id: payload.staff_id ?? null,
    p_notes: payload.notes ?? null,
  });

  if (error) {
    console.error("appointments.rpc.error", {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      full: error,
    });
    if (isCapacityOverlapError(error)) {
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

  const appointment = mapAppointment(data);

  void logAppointmentAuditEvent({
    appointmentId: appointment.id,
    eventType: "cancelled",
    actorType: input.actorType ?? "system",
    actorId: input.actorId ?? null,
    metadata: {
      cancellation_reason: appointment.cancellationReason ?? null,
      status: appointment.status,
    },
    supabase,
  });

  return appointment;
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
  let previousTimes: { start_time: string; end_time: string } | null = null;

  try {
    const { data } = await supabase
      .from(TABLES.appointments)
      .select("start_time, end_time")
      .eq("id", input.appointmentId)
      .eq("region_code", REGION)
      .maybeSingle();
    if (data) {
      previousTimes = data as { start_time: string; end_time: string };
    }
  } catch (error) {
    console.warn("appointments.audit_log_prefetch_failed", {
      error,
      appointmentId: input.appointmentId,
    });
  }

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
    if (isCapacityOverlapError(error)) {
      throw new DomainError("Appointment overlaps an existing booking", { error, input });
    }
    throw new DomainError("Unable to reschedule appointment", { error, input });
  }

  if (!data) {
    throw new DomainError("Unable to reschedule appointment", { error, input });
  }

  const appointment = mapAppointment(data);

  void logAppointmentAuditEvent({
    appointmentId: appointment.id,
    eventType: "rescheduled",
    actorType: input.actorType ?? "system",
    actorId: input.actorId ?? null,
    metadata: {
      from_start_time: previousTimes?.start_time ?? null,
      from_end_time: previousTimes?.end_time ?? null,
      to_start_time: appointment.startTime,
      to_end_time: appointment.endTime,
      reason: input.reason ?? null,
      source: input.source ?? null,
    },
    supabase,
  });

  return appointment;
}

export async function listAppointmentsForBusiness(
  businessId: string,
  options: number | ListAppointmentsForBusinessOptions = DASHBOARD_LIMITS.appointments,
): Promise<AppointmentRecord[]> {
  const resolvedOptions =
    typeof options === "number"
      ? { limit: options }
      : { limit: DASHBOARD_LIMITS.appointments, ...options };
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("appointments")
    .select()
    .eq("business_id", businessId)
    .eq("region_code", REGION)
    .order("start_time", { ascending: true })
    .limit(resolvedOptions.limit ?? DASHBOARD_LIMITS.appointments);

  if (resolvedOptions.onlyUpcoming) {
    query = query.gte("start_time", new Date().toISOString());
  }

  if (resolvedOptions.statuses && resolvedOptions.statuses.length > 0) {
    query = query.in("status", resolvedOptions.statuses);
  }

  const { data, error } = await query;

  if (error) {
    throw new DomainError("Unable to load appointments", { error, businessId, options: resolvedOptions });
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

  const [availabilityRes, exceptionsRes, appointmentsRes] = await Promise.all([
    supabase
      .from(TABLES.availabilityBlocks)
      .select("id, staff_id, day_of_week, start_time, end_time, capacity")
      .eq("staff_id", providerId)
      .eq("business_id", businessId)
      .eq("day_of_week", dayOfWeek)
      .eq("region_code", REGION),
    supabase
      .from(TABLES.availabilityExceptions)
      .select("id, staff_id, exception_date, is_closed, start_time, end_time, capacity")
      .eq("staff_id", providerId)
      .eq("business_id", businessId)
      .eq("exception_date", date)
      .eq("region_code", REGION)
      .order("created_at", { ascending: false })
      .limit(1),
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

  if (exceptionsRes.error) {
    throw new DomainError("Unable to load availability exceptions", {
      error: exceptionsRes.error,
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
  const exceptionRows = (exceptionsRes.data ?? []) as Tables<"availability_exceptions">[];
  const appointmentRows = (appointmentsRes.data ?? []) as Tables<"appointments">[];
  const exception = exceptionRows[0];
  const effectiveAvailabilityRows: SlotAvailabilityWindow[] = exception
    ? exception.is_closed || !exception.start_time || !exception.end_time
      ? []
      : [
          {
            start_time: exception.start_time,
            end_time: exception.end_time,
            capacity: exception.capacity,
          },
        ]
    : availabilityRows;
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

  effectiveAvailabilityRows.forEach((block) => {
    if (!block.start_time || !block.end_time) return;
    const blockStart = applyTimeToDate(dayStart, block.start_time);
    const blockEnd = applyTimeToDate(dayStart, block.end_time);
    if (!blockStart || !blockEnd) return;
    for (let ts = blockStart.getTime(); ts + slotMs <= blockEnd.getTime(); ts += slotMs) {
      const slotStart = new Date(ts);
      const slotEnd = new Date(ts + slotMs);
      const overlapCount = filteredAppointments.reduce((count, appt) => {
        const apptStart = parseTimestamp(appt.start_time);
        const apptEnd = parseTimestamp(appt.end_time);
        if (!apptStart || !apptEnd) return count;
        return apptStart < slotEnd && apptEnd > slotStart ? count + 1 : count;
      }, 0);
      const capacity = Math.max(block.capacity ?? 1, 1);

      if (overlapCount < capacity) {
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
  let query = supabase
    .from("availability_blocks")
    .select()
    .eq("business_id", request.businessId)
    .eq("region_code", REGION)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (request.providerId) {
    query = query.eq("staff_id", request.providerId);
  }

  if (typeof request.dayOfWeek === "number") {
    if (request.dayOfWeek < 0 || request.dayOfWeek > 6) {
      throw new DomainError("Invalid dayOfWeek in availability request", { request });
    }
    query = query.eq("day_of_week", request.dayOfWeek);
  }

  const { data, error } = await query;

  if (error) {
    throw new DomainError("Unable to load availability", { error, request });
  }

  return (data ?? []).map(mapAvailability);
}

export async function createAvailabilityBlocks(
  inputs: CreateAvailabilityBlockInput[],
): Promise<AvailabilityBlock[]> {
  if (inputs.length < 1) {
    throw new DomainError("At least one availability block is required");
  }

  const supabase = getSupabaseAdmin();
  const payload: TablesInsert<"availability_blocks">[] = inputs.map((input) => {
    const normalized = validateAvailabilityInput(input);

    return {
      business_id: input.businessId,
      region_code: REGION,
      day_of_week: normalized.dayOfWeek,
      start_time: normalized.startTime,
      end_time: normalized.endTime,
      capacity: normalized.capacity,
    };
  });

  const { data, error } = await supabase
    .from(TABLES.availabilityBlocks)
    .insert(payload)
    .select();

  if (error) {
    throw new DomainError("Unable to create availability blocks", { error, inputs });
  }

  return (data ?? []).map(mapAvailability);
}

export async function updateAvailabilityBlock(
  input: UpdateAvailabilityBlockInput,
): Promise<AvailabilityBlock> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from(TABLES.availabilityBlocks)
    .select()
    .eq("id", input.availabilityBlockId)
    .eq("business_id", input.businessId)
    .eq("region_code", REGION)
    .maybeSingle();

  if (existingError) {
    throw new DomainError("Unable to load availability block", { error: existingError, input });
  }

  if (!existing) {
    throw new DomainError("Availability block not found", { input, region: REGION });
  }

  const normalized = validateAvailabilityInput({
    dayOfWeek: input.dayOfWeek ?? existing.day_of_week,
    startTime: input.startTime ?? existing.start_time,
    endTime: input.endTime ?? existing.end_time,
    capacity: input.capacity ?? existing.capacity,
  });

  const patch: TablesUpdate<"availability_blocks"> = {
    day_of_week: normalized.dayOfWeek,
    start_time: normalized.startTime,
    end_time: normalized.endTime,
    capacity: normalized.capacity,
  };

  const { data, error } = await supabase
    .from(TABLES.availabilityBlocks)
    .update(patch)
    .eq("id", input.availabilityBlockId)
    .eq("business_id", input.businessId)
    .eq("region_code", REGION)
    .select()
    .maybeSingle();

  if (error || !data) {
    throw new DomainError("Unable to update availability block", { error, input, patch });
  }

  return mapAvailability(data);
}

export async function deleteAvailabilityBlock(input: DeleteAvailabilityBlockInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from(TABLES.availabilityBlocks)
    .delete({ count: "exact" })
    .eq("id", input.availabilityBlockId)
    .eq("business_id", input.businessId)
    .eq("region_code", REGION);

  if (error) {
    throw new DomainError("Unable to delete availability block", { error, input });
  }

  if (count === 0) {
    throw new DomainError("Availability block not found", { input, region: REGION });
  }
}
