"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ZodError } from "zod";
import type { BusinessSettings } from "@/domain/businesses";
import { updateBusinessPublicBookingPageSettings } from "@/domain/businesses";
import {
  type UpdateDashboardBusinessSettingsInput,
  updateDashboardBusinessSettingsSchema,
} from "@/features/dashboard/utils/businessSettingsSchema";
import { requireBusinessOwnerAccess } from "@/lib/auth/server";

function refreshBusinessPages(slug: string) {
  revalidateTag("dashboard-data");
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/${slug}/book`);
}

function toActionErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Unable to save business settings";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to save business settings";
}

export type BusinessSettingsMutationResult =
  | { ok: true; settings: BusinessSettings }
  | { ok: false; message: string };

export async function updateDashboardBusinessSettingsAction(
  input: UpdateDashboardBusinessSettingsInput,
): Promise<BusinessSettingsMutationResult> {
  try {
    const payload = updateDashboardBusinessSettingsSchema.parse(input);
    await requireBusinessOwnerAccess(payload.businessId);
    const business = await updateBusinessPublicBookingPageSettings({
      businessId: payload.businessId,
      showBusinessName: payload.showBusinessName,
      serviceVisibility: payload.serviceVisibility,
      visibleServiceIds: payload.visibleServiceIds,
    });
    refreshBusinessPages(payload.businessSlug);
    return { ok: true, settings: business.settings };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}
