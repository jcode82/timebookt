"use server";

import { addDays } from "date-fns";
import { getBusinessBySlug } from "@/domain/businesses";
import { listServicesForBusiness } from "@/domain/services";
import { getAvailability } from "@/domain/appointments";

export async function getBookingContext(slug: string) {
  const business = await getBusinessBySlug(slug);
  if (!business) {
    return null;
  }

  const [services, availability] = await Promise.all([
    listServicesForBusiness(business.id),
    getAvailability({
      businessId: business.id,
      startDate: new Date().toISOString(),
      endDate: addDays(new Date(), 7).toISOString(),
    }),
  ]);

  return { business, services, availability };
}
