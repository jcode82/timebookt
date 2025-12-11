"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCustomer } from "@/domain/customers";
import { createAppointment } from "@/domain/appointments";
import { bookingSchema } from "@/features/booking/utils/schema";

const actionSchema = bookingSchema.extend({
  businessId: z.string().min(1),
  businessSlug: z.string().min(1),
});

export type CreateBookingActionInput = z.infer<typeof actionSchema>;

export async function createBookingAction(input: CreateBookingActionInput) {
  const parsed = actionSchema.parse(input);
  const customer = await createCustomer({
    businessId: parsed.businessId,
    name: parsed.customerName,
    email: parsed.customerEmail,
    phone: parsed.customerPhone,
  });

  const appointment = await createAppointment({
    businessId: parsed.businessId,
    customerId: customer.id,
    serviceId: parsed.serviceId,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    notes: parsed.notes,
  });

  revalidatePath(`/${parsed.businessSlug}/book`);
  return appointment;
}
