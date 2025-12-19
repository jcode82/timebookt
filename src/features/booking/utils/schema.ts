import { z } from "zod";

export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  notes: z.string().optional(),
});

export type BookingFormState = z.infer<typeof bookingSchema>;
