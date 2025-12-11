import { z } from "zod";

export const businessOnboardingSchema = z.object({
  name: z.string().min(2),
  regionCode: z.string().min(2).max(10),
  timezone: z.string().min(3),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
});

export type BusinessOnboardingForm = z.infer<typeof businessOnboardingSchema>;
