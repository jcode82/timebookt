import { z } from "zod";

const serviceVisibilityOptions = ["all", "selected"] as const;

export const updateDashboardBusinessSettingsSchema = z
  .object({
    businessId: z.string().min(1),
    businessSlug: z.string().min(1),
    showBusinessName: z.boolean(),
    serviceVisibility: z.enum(serviceVisibilityOptions),
    visibleServiceIds: z.array(z.string().min(1)).default([]),
  })
  .superRefine((value, context) => {
    if (value.serviceVisibility === "selected" && value.visibleServiceIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one service for the booking page.",
        path: ["visibleServiceIds"],
      });
    }
  });

export type UpdateDashboardBusinessSettingsInput = z.input<typeof updateDashboardBusinessSettingsSchema>;
