"use server";

import { createAvailabilityBlocks } from "@/domain/appointments";
import { completeBusinessOnboarding, createBusinessForOwner } from "@/domain/businesses";
import { createService } from "@/domain/services/actions";
import {
  availabilityBlocksSchema,
  businessProfileSchema,
  serviceSchema,
} from "@/features/onboarding/utils/schema";
import { requireBusinessOwnerAccess, requireSessionUser } from "@/lib/auth/server";

export async function createOnboardingBusinessAction(input: unknown) {
  const user = await requireSessionUser();
  const payload = businessProfileSchema.parse(input);
  const business = await createBusinessForOwner(payload, {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
  });
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
  };
}

export async function createOnboardingServiceAction(input: unknown) {
  const payload = serviceSchema.parse(input);
  await requireBusinessOwnerAccess(payload.businessId);
  return createService(payload);
}

export async function createOnboardingAvailabilityAction(input: unknown) {
  const payload = availabilityBlocksSchema.parse(input);
  await Promise.all(payload.blocks.map((block) => requireBusinessOwnerAccess(block.businessId)));
  return createAvailabilityBlocks(payload.blocks);
}

export async function completeOnboardingAction(input: { businessId: string; slug: string }) {
  await requireBusinessOwnerAccess(input.businessId);
  await completeBusinessOnboarding(input.businessId);
  return { slug: input.slug };
}
