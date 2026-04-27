import { z } from "zod";

const pricePattern = /^\d+(?:\.\d{1,2})?$/;
const durationPattern = /^\d+$/;

function parsePriceToCents(value: string) {
  return Math.round(Number(value) * 100);
}

const serviceFormFieldsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  durationMinutes: z
    .string()
    .trim()
    .regex(durationPattern, "Duration must be a whole number")
    .transform((value) => Number(value))
    .refine((value) => value >= 5, "Duration must be at least 5 minutes"),
  price: z
    .string()
    .trim()
    .regex(pricePattern, "Price must be a valid amount")
    .transform(parsePriceToCents),
});

const serviceActionBaseSchema = z.object({
  businessId: z.string().min(1),
  businessSlug: z.string().min(1),
});

export const createDashboardServiceSchema = serviceActionBaseSchema
  .merge(serviceFormFieldsSchema)
  .transform((value) => ({
    businessId: value.businessId,
    businessSlug: value.businessSlug,
    name: value.name,
    durationMinutes: value.durationMinutes,
    priceCents: value.price,
    currency: "USD" as const,
  }));

export const updateDashboardServiceSchema = serviceActionBaseSchema
  .merge(serviceFormFieldsSchema)
  .extend({
    serviceId: z.string().min(1),
  })
  .transform((value) => ({
    businessId: value.businessId,
    businessSlug: value.businessSlug,
    serviceId: value.serviceId,
    name: value.name,
    durationMinutes: value.durationMinutes,
    priceCents: value.price,
    currency: "USD" as const,
  }));

export const setDashboardServiceActiveStateSchema = serviceActionBaseSchema.extend({
  serviceId: z.string().min(1),
  isActive: z.boolean(),
});

export interface ServiceFormValues {
  name: string;
  durationMinutes: string;
  price: string;
}

export type CreateDashboardServiceInput = z.input<typeof createDashboardServiceSchema>;
export type UpdateDashboardServiceInput = z.input<typeof updateDashboardServiceSchema>;
export type SetDashboardServiceActiveStateInput = z.infer<typeof setDashboardServiceActiveStateSchema>;
