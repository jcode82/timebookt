"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { AvailabilityBlock, AvailabilityException } from "@/domain/appointments";
import {
  createAvailabilityBlocks,
  createAvailabilityException,
  deleteAvailabilityException,
  deleteAvailabilityBlock,
  updateAvailabilityException,
  updateAvailabilityBlock,
} from "@/domain/appointments/actions";
import {
  createDashboardAvailabilitySchema,
  createDashboardAvailabilityExceptionSchema,
  deleteDashboardAvailabilitySchema,
  deleteDashboardAvailabilityExceptionSchema,
  updateDashboardAvailabilitySchema,
  updateDashboardAvailabilityExceptionSchema,
  type CreateDashboardAvailabilityInput,
  type CreateDashboardAvailabilityExceptionInput,
  type DeleteDashboardAvailabilityInput,
  type DeleteDashboardAvailabilityExceptionInput,
  type UpdateDashboardAvailabilityInput,
  type UpdateDashboardAvailabilityExceptionInput,
} from "@/features/dashboard/utils/availabilityManagementSchema";
import { requireBusinessOwnerAccess } from "@/lib/auth/server";

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
export type AvailabilityExceptionMutationResult =
  | { ok: true; availabilityException: AvailabilityException }
  | { ok: false; message: string };
export type AvailabilityExceptionDeleteResult = { ok: true } | { ok: false; message: string };

export async function createDashboardAvailabilityAction(
  input: CreateDashboardAvailabilityInput,
): Promise<AvailabilityMutationResult> {
  try {
    const payload = createDashboardAvailabilitySchema.parse(input);
    const { businessSlug, ...availabilityInput } = payload;
    await requireBusinessOwnerAccess(availabilityInput.businessId);
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
    await requireBusinessOwnerAccess(availabilityInput.businessId);
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
    await requireBusinessOwnerAccess(payload.businessId);
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

export async function createDashboardAvailabilityExceptionAction(
  input: CreateDashboardAvailabilityExceptionInput,
): Promise<AvailabilityExceptionMutationResult> {
  try {
    const payload = createDashboardAvailabilityExceptionSchema.parse(input);
    const { businessSlug, ...availabilityExceptionInput } = payload;
    await requireBusinessOwnerAccess(availabilityExceptionInput.businessId);
    const availabilityException = await createAvailabilityException(availabilityExceptionInput);
    refreshDashboard(businessSlug);
    return { ok: true, availabilityException };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}

export async function updateDashboardAvailabilityExceptionAction(
  input: UpdateDashboardAvailabilityExceptionInput,
): Promise<AvailabilityExceptionMutationResult> {
  try {
    const payload = updateDashboardAvailabilityExceptionSchema.parse(input);
    const { businessSlug, ...availabilityExceptionInput } = payload;
    await requireBusinessOwnerAccess(availabilityExceptionInput.businessId);
    const availabilityException = await updateAvailabilityException(availabilityExceptionInput);
    refreshDashboard(businessSlug);
    return { ok: true, availabilityException };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}

export async function deleteDashboardAvailabilityExceptionAction(
  input: DeleteDashboardAvailabilityExceptionInput,
): Promise<AvailabilityExceptionDeleteResult> {
  try {
    const payload = deleteDashboardAvailabilityExceptionSchema.parse(input);
    await requireBusinessOwnerAccess(payload.businessId);
    await deleteAvailabilityException({
      availabilityExceptionId: payload.availabilityExceptionId,
      businessId: payload.businessId,
    });
    refreshDashboard(payload.businessSlug);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error) };
  }
}
