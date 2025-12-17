"use server";

import { redirect } from "next/navigation";
import { createBusiness } from "@/domain/businesses";
import type { BusinessOnboardingForm } from "@/features/onboarding/utils/schema";

export async function createBusinessAction(input: BusinessOnboardingForm) {
  const business = await createBusiness(input);
  redirect(`/dashboard/${business.slug}`);
}
