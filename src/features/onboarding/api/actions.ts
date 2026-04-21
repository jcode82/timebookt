"use server";

import { createAvailabilityBlocks } from "@/domain/appointments";
import { completeBusinessOnboarding, createBusiness } from "@/domain/businesses";
import { createService } from "@/domain/services";
import {
  availabilityBlocksSchema,
  businessProfileSchema,
  serviceSchema,
} from "@/features/onboarding/utils/schema";

export async function createOnboardingBusinessAction(input: unknown) {
  const payload = businessProfileSchema.parse(input);
  const business = await createBusiness(payload);
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
  };
}

export async function createOnboardingServiceAction(input: unknown) {
  const payload = serviceSchema.parse(input);
  return createService(payload);
}

export async function createOnboardingAvailabilityAction(input: unknown) {
  const payload = availabilityBlocksSchema.parse(input);
  return createAvailabilityBlocks(payload.blocks);
}

export async function completeOnboardingAction(input: { businessId: string; slug: string }) {
  await completeBusinessOnboarding(input.businessId);
  return { slug: input.slug };
}
