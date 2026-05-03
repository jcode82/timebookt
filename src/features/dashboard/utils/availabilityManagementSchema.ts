import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const wholeNumberPattern = /^\d+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizeTime(value: string) {
  const [hours, minutes] = value.split(":");
  return `${hours}:${minutes}:00`;
}

const availabilityFormFieldsBaseSchema = z.object({
  dayOfWeek: z
    .string()
    .trim()
    .regex(/^[0-6]$/, "Day of week is required")
    .transform((value) => Number(value)),
  startTime: z
    .string()
    .trim()
    .regex(timePattern, "Start time must use HH:mm")
    .transform(normalizeTime),
  endTime: z
    .string()
    .trim()
    .regex(timePattern, "End time must use HH:mm")
    .transform(normalizeTime),
  capacity: z
    .string()
    .trim()
    .regex(wholeNumberPattern, "Capacity must be a whole number")
    .transform((value) => Number(value))
    .refine((value) => value >= 1, "Capacity must be at least 1"),
});

function withTimeWindowValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine((value) => value.endTime > value.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
}

const availabilityActionBaseSchema = z.object({
  businessId: z.string().min(1),
  businessSlug: z.string().min(1),
});

const availabilityExceptionFormFieldsBaseSchema = z.object({
  staffId: z.string().min(1, "Provider is required"),
  exceptionDate: z.string().trim().regex(datePattern, "Date is required"),
  overrideType: z.enum(["closed", "open"]),
  startTime: z.string().trim(),
  endTime: z.string().trim(),
  capacity: z
    .string()
    .trim()
    .regex(wholeNumberPattern, "Capacity must be a whole number")
    .transform((value) => Number(value))
    .refine((value) => value >= 1, "Capacity must be at least 1"),
});

export const createDashboardAvailabilitySchema = withTimeWindowValidation(
  availabilityActionBaseSchema.merge(availabilityFormFieldsBaseSchema),
)
  .transform((value) => ({
    businessId: value.businessId,
    businessSlug: value.businessSlug,
    dayOfWeek: value.dayOfWeek,
    startTime: value.startTime,
    endTime: value.endTime,
    capacity: value.capacity,
  }));

export const updateDashboardAvailabilitySchema = withTimeWindowValidation(
  availabilityActionBaseSchema.merge(availabilityFormFieldsBaseSchema).extend({
    availabilityBlockId: z.string().min(1),
  }),
)
  .transform((value) => ({
    availabilityBlockId: value.availabilityBlockId,
    businessId: value.businessId,
    businessSlug: value.businessSlug,
    dayOfWeek: value.dayOfWeek,
    startTime: value.startTime,
    endTime: value.endTime,
    capacity: value.capacity,
  }));

export const deleteDashboardAvailabilitySchema = availabilityActionBaseSchema.extend({
  availabilityBlockId: z.string().min(1),
});

export const createDashboardAvailabilityExceptionSchema = availabilityActionBaseSchema
  .merge(availabilityExceptionFormFieldsBaseSchema)
  .superRefine((value, ctx) => {
    if (value.overrideType === "closed") {
      return;
    }

    if (!timePattern.test(value.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time must use HH:mm",
        path: ["startTime"],
      });
    }

    if (!timePattern.test(value.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must use HH:mm",
        path: ["endTime"],
      });
    }

    if (timePattern.test(value.startTime) && timePattern.test(value.endTime) && value.endTime <= value.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  })
  .transform((value) => ({
    businessId: value.businessId,
    businessSlug: value.businessSlug,
    staffId: value.staffId,
    exceptionDate: value.exceptionDate,
    isClosed: value.overrideType === "closed",
    startTime: value.overrideType === "closed" ? null : normalizeTime(value.startTime),
    endTime: value.overrideType === "closed" ? null : normalizeTime(value.endTime),
    capacity: value.capacity,
  }));

export const updateDashboardAvailabilityExceptionSchema = availabilityActionBaseSchema
  .merge(availabilityExceptionFormFieldsBaseSchema)
  .extend({
    availabilityExceptionId: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.overrideType === "closed") {
      return;
    }

    if (!timePattern.test(value.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time must use HH:mm",
        path: ["startTime"],
      });
    }

    if (!timePattern.test(value.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must use HH:mm",
        path: ["endTime"],
      });
    }

    if (timePattern.test(value.startTime) && timePattern.test(value.endTime) && value.endTime <= value.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  })
  .transform((value) => ({
    availabilityExceptionId: value.availabilityExceptionId,
    businessId: value.businessId,
    businessSlug: value.businessSlug,
    staffId: value.staffId,
    exceptionDate: value.exceptionDate,
    isClosed: value.overrideType === "closed",
    startTime: value.overrideType === "closed" ? null : normalizeTime(value.startTime),
    endTime: value.overrideType === "closed" ? null : normalizeTime(value.endTime),
    capacity: value.capacity,
  }));

export const deleteDashboardAvailabilityExceptionSchema = availabilityActionBaseSchema.extend({
  availabilityExceptionId: z.string().min(1),
});

export interface AvailabilityFormValues {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: string;
}

export interface AvailabilityExceptionFormValues {
  staffId: string;
  exceptionDate: string;
  overrideType: "closed" | "open";
  startTime: string;
  endTime: string;
  capacity: string;
}

export type CreateDashboardAvailabilityInput = z.input<typeof createDashboardAvailabilitySchema>;
export type UpdateDashboardAvailabilityInput = z.input<typeof updateDashboardAvailabilitySchema>;
export type DeleteDashboardAvailabilityInput = z.infer<typeof deleteDashboardAvailabilitySchema>;
export type CreateDashboardAvailabilityExceptionInput = z.input<
  typeof createDashboardAvailabilityExceptionSchema
>;
export type UpdateDashboardAvailabilityExceptionInput = z.input<
  typeof updateDashboardAvailabilityExceptionSchema
>;
export type DeleteDashboardAvailabilityExceptionInput = z.infer<
  typeof deleteDashboardAvailabilityExceptionSchema
>;
