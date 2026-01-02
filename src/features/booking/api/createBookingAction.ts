"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCanonicalAppointment } from "@/domain/appointments";
import { sendBookingConfirmationEmail } from "@/lib/email/sendBookingConfirmationEmail";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import { REGION } from "@/lib/env";
import { bookingSchema } from "@/features/booking/utils/schema";

const actionSchema = bookingSchema.extend({
  businessId: z.string().min(1),
  businessSlug: z.string().min(1),
  providerId: z.string().min(1),
});

export type CreateBookingActionInput = z.infer<typeof actionSchema>;

export type BookingConfirmation = {
  appointmentId: string;
  service: string;
  provider: string;
  startTime: string;
};

export async function createBookingAction(input: CreateBookingActionInput): Promise<BookingConfirmation> {
  const parsedResult = actionSchema.safeParse(input);
  if (!parsedResult.success) {
    console.error("Invalid booking input", { issues: parsedResult.error.flatten(), input });
    throw new Error("Invalid booking input");
  }
  const parsed = parsedResult.data;
  const appointment = await createCanonicalAppointment({
    serviceId: parsed.serviceId,
    providerId: parsed.providerId,
    regionCode: REGION,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    customerName: parsed.customerName,
    customerEmail: parsed.customerEmail,
    customerPhone: parsed.customerPhone,
    notes: parsed.notes,
  });

  const supabase = getSupabaseAdmin();
  const [serviceRes, providerRes] = await Promise.all([
    supabase
      .from(TABLES.services)
      .select("id, name")
      .eq("id", parsed.serviceId)
      .maybeSingle(),
    supabase
      .from(TABLES.staff)
      .select("id, full_name")
      .eq("id", parsed.providerId)
      .maybeSingle(),
  ]);

  if (serviceRes.error || !serviceRes.data) {
    throw serviceRes.error ?? new Error("Unable to load service");
  }

  if (providerRes.error || !providerRes.data) {
    throw providerRes.error ?? new Error("Unable to load provider");
  }

  const serviceRow = serviceRes.data as { id: string; name: string };
  const providerRow = providerRes.data as { id: string; full_name: string | null };

  const confirmation: BookingConfirmation = {
    appointmentId: appointment.id,
    service: serviceRow.name,
    provider: providerRow.full_name ?? "Provider",
    startTime: appointment.startTime,
  };

  revalidatePath(`/${parsed.businessSlug}/book`);

  void sendBookingConfirmationEmail({
    to: parsed.customerEmail,
    service: confirmation.service,
    provider: confirmation.provider,
    startTime: confirmation.startTime,
  }).catch((error) => {
    console.error("Failed to send booking confirmation email", { error, appointmentId: confirmation.appointmentId });
  });
  return confirmation;
}
