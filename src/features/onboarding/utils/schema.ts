import { z } from "zod";

export const businessProfileSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens"),
  regionCode: z.string().min(2).max(10),
  timezone: z.string().min(3),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
});

export const serviceSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(5),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().min(3).max(3).default("USD"),
});

export const availabilityBlockSchema = z
  .object({
    businessId: z.string().min(1),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    capacity: z.coerce.number().int().min(1).default(1),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const availabilityBlocksSchema = z.object({
  blocks: z.array(availabilityBlockSchema).min(1),
});

export type BusinessOnboardingForm = z.infer<typeof businessProfileSchema>;
export type OnboardingServiceForm = z.infer<typeof serviceSchema>;
export type AvailabilityBlockForm = z.infer<typeof availabilityBlockSchema>;
