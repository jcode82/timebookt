"use server";

import { revalidatePath } from "next/cache";
import { createBusiness } from "@/domain/businesses";
import type { BusinessOnboardingForm } from "@/features/onboarding/utils/schema";

export async function createBusinessAction(input: BusinessOnboardingForm) {
  const business = await createBusiness(input);
  revalidatePath("/dashboard");
  return business;
}
