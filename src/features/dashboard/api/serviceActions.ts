"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { ServiceRecord } from "@/domain/services/types";
import { createService, updateService } from "@/domain/services/actions";
import {
  createDashboardServiceSchema,
  setDashboardServiceActiveStateSchema,
  updateDashboardServiceSchema,
  type CreateDashboardServiceInput,
  type SetDashboardServiceActiveStateInput,
  type UpdateDashboardServiceInput,
} from "@/features/dashboard/utils/serviceManagementSchema";
import { requireBusinessOwnerAccess } from "@/lib/auth/server";

function refreshDashboard(slug: string) {
  revalidateTag("dashboard-data");
  revalidatePath(`/dashboard/${slug}`);
}

export type ServiceMutationResult =
  | { ok: true; service: ServiceRecord }
  | { ok: false; message: string };

function toActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to save service changes";
}

export async function createDashboardServiceAction(
  input: CreateDashboardServiceInput,
): Promise<ServiceMutationResult> {
  try {
    const payload = createDashboardServiceSchema.parse(input);
    const { businessSlug, ...serviceInput } = payload;
    await requireBusinessOwnerAccess(serviceInput.businessId);
    const service = await createService(serviceInput);
    refreshDashboard(businessSlug);
    return { ok: true, service };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}

export async function updateDashboardServiceAction(
  input: UpdateDashboardServiceInput,
): Promise<ServiceMutationResult> {
  try {
    const payload = updateDashboardServiceSchema.parse(input);
    const { businessSlug, ...serviceInput } = payload;
    await requireBusinessOwnerAccess(serviceInput.businessId);
    const service = await updateService(serviceInput);
    refreshDashboard(businessSlug);
    return { ok: true, service };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}

export async function setDashboardServiceActiveStateAction(
  input: SetDashboardServiceActiveStateInput,
): Promise<ServiceMutationResult> {
  try {
    const payload = setDashboardServiceActiveStateSchema.parse(input);
    await requireBusinessOwnerAccess(payload.businessId);
    const service = await updateService({
      serviceId: payload.serviceId,
      businessId: payload.businessId,
      isActive: payload.isActive,
    });
    refreshDashboard(payload.businessSlug);
    return { ok: true, service };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}
