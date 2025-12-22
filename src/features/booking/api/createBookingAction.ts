"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCanonicalAppointment } from "@/domain/appointments";
import { REGION } from "@/lib/env";
import { bookingSchema } from "@/features/booking/utils/schema";

const actionSchema = bookingSchema.extend({
  businessId: z.string().min(1),
  businessSlug: z.string().min(1),
  providerId: z.string().min(1),
});

export type CreateBookingActionInput = z.infer<typeof actionSchema>;

export async function createBookingAction(input: CreateBookingActionInput) {
  const parsed = actionSchema.parse(input);
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

  revalidatePath(`/${parsed.businessSlug}/book`);
  return appointment;
}
