"use server";

import { getAvailability } from "@/domain/appointments";
import type { AvailabilityRequest } from "@/domain/appointments";

export async function getAvailabilityAction(request: AvailabilityRequest) {
  return getAvailability(request);
}
