"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { AvailabilityBlock } from "@/domain/appointments";
import {
  createAvailabilityBlocks,
  deleteAvailabilityBlock,
  updateAvailabilityBlock,
} from "@/domain/appointments/actions";
import {
  createDashboardAvailabilitySchema,
  deleteDashboardAvailabilitySchema,
  updateDashboardAvailabilitySchema,
  type CreateDashboardAvailabilityInput,
  type DeleteDashboardAvailabilityInput,
  type UpdateDashboardAvailabilityInput,
} from "@/features/dashboard/utils/availabilityManagementSchema";

function refreshDashboard(slug: string) {
  revalidateTag("dashboard-data");
  revalidatePath(`/dashboard/${slug}`);
}

function toActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to save availability changes";
}

export type AvailabilityMutationResult =
  | { ok: true; availabilityBlock: AvailabilityBlock }
  | { ok: false; message: string };

export type AvailabilityDeleteResult = { ok: true } | { ok: false; message: string };

export async function createDashboardAvailabilityAction(
  input: CreateDashboardAvailabilityInput,
): Promise<AvailabilityMutationResult> {
  try {
    const payload = createDashboardAvailabilitySchema.parse(input);
    const { businessSlug, ...availabilityInput } = payload;
    const [availabilityBlock] = await createAvailabilityBlocks([availabilityInput]);

    if (!availabilityBlock) {
      throw new Error("Availability block was not returned");
    }

    refreshDashboard(businessSlug);
    return { ok: true, availabilityBlock };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}

export async function updateDashboardAvailabilityAction(
  input: UpdateDashboardAvailabilityInput,
): Promise<AvailabilityMutationResult> {
  try {
    const payload = updateDashboardAvailabilitySchema.parse(input);
    const { businessSlug, ...availabilityInput } = payload;
    const availabilityBlock = await updateAvailabilityBlock(availabilityInput);
    refreshDashboard(businessSlug);
    return { ok: true, availabilityBlock };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}

export async function deleteDashboardAvailabilityAction(
  input: DeleteDashboardAvailabilityInput,
): Promise<AvailabilityDeleteResult> {
  try {
    const payload = deleteDashboardAvailabilitySchema.parse(input);
    await deleteAvailabilityBlock({
      availabilityBlockId: payload.availabilityBlockId,
      businessId: payload.businessId,
    });
    refreshDashboard(payload.businessSlug);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}
