"use server";

import { unstable_cache } from "next/cache";
import { getBusinessBySlug, getBusinessDashboardMetrics } from "@/domain/businesses";
import { getAvailability, listAppointmentsForBusiness } from "@/domain/appointments";
import { listServicesForBusiness } from "@/domain/services";
import { CACHE_ONE_HOUR } from "@/features/dashboard/utils/constants";

export interface DashboardData {
  businessId: string;
  businessName: string;
  slug: string;
  timezone: string;
  isOnboarded: boolean;
  metrics: Awaited<ReturnType<typeof getBusinessDashboardMetrics>>;
  appointments: Awaited<ReturnType<typeof listAppointmentsForBusiness>>;
  services: Awaited<ReturnType<typeof listServicesForBusiness>>;
  availability: Awaited<ReturnType<typeof getAvailability>>;
}

const getCachedDashboardData = unstable_cache(
  async (slug: string): Promise<DashboardData | null> => {
    const business = await getBusinessBySlug(slug);
    if (!business) {
      return null;
    }

    const [metrics, appointments, services, availability] = await Promise.all([
      getBusinessDashboardMetrics(business.id),
      listAppointmentsForBusiness(business.id, {
        limit: 10,
        onlyUpcoming: true,
        statuses: ["scheduled"],
      }),
      listServicesForBusiness(business.id),
      getAvailability({ businessId: business.id }),
    ]);

    return {
      businessId: business.id,
      businessName: business.name,
      slug: business.slug,
      timezone: business.timezone,
      isOnboarded: business.isOnboarded,
      metrics,
      appointments,
      services,
      availability,
    };
  },
  ["dashboard-data"],
  { revalidate: CACHE_ONE_HOUR },
);

export async function getDashboardData(slug: string): Promise<DashboardData | null> {
  return getCachedDashboardData(slug);
}
