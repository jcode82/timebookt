"use server";

import { getProviderAvailabilityForDate } from "@/domain/appointments";
import type { ProviderAvailabilityRequest } from "@/domain/appointments";

export async function getProviderAvailabilityAction(
  request: ProviderAvailabilityRequest,
) {
  return getProviderAvailabilityForDate(request);
}
