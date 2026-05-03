"use server";

import { unstable_cache } from "next/cache";
import { getBusinessBySlug, getBusinessDashboardMetrics, listStaffForBusiness } from "@/domain/businesses";
import {
  getAvailability,
  getAvailabilityExceptions,
  listAppointmentsForBusiness,
} from "@/domain/appointments";
import { listBookedCustomersForBusiness } from "@/domain/customers";
import { listServicesForBusiness } from "@/domain/services/actions";
import { CACHE_ONE_HOUR } from "@/features/dashboard/utils/constants";

export interface DashboardData {
  businessId: string;
  businessName: string;
  slug: string;
  timezone: string;
  isOnboarded: boolean;
  metrics: Awaited<ReturnType<typeof getBusinessDashboardMetrics>>;
  appointments: Awaited<ReturnType<typeof listAppointmentsForBusiness>>;
  customers: Awaited<ReturnType<typeof listBookedCustomersForBusiness>>;
  services: Awaited<ReturnType<typeof listServicesForBusiness>>;
  availability: Awaited<ReturnType<typeof getAvailability>>;
  availabilityExceptions: Awaited<ReturnType<typeof getAvailabilityExceptions>>;
  staffMembers: Awaited<ReturnType<typeof listStaffForBusiness>>;
}

const getCachedDashboardData = unstable_cache(
  async (slug: string): Promise<DashboardData | null> => {
    const business = await getBusinessBySlug(slug);
    if (!business) {
      return null;
    }

    const [metrics, appointments, customers, services, availability, availabilityExceptions, staffMembers] =
      await Promise.all([
      getBusinessDashboardMetrics(business.id),
      listAppointmentsForBusiness(business.id, {
        limit: 10,
        onlyUpcoming: true,
        statuses: ["scheduled"],
      }),
      listBookedCustomersForBusiness({
        businessId: business.id,
        limit: 25,
      }),
      listServicesForBusiness(business.id, { includeInactive: true }),
      getAvailability({ businessId: business.id }),
      getAvailabilityExceptions({ businessId: business.id }),
      listStaffForBusiness(business.id),
    ]);

    return {
      businessId: business.id,
      businessName: business.name,
      slug: business.slug,
      timezone: business.timezone,
      isOnboarded: business.isOnboarded,
      metrics,
      appointments,
      customers,
      services,
      availability,
      availabilityExceptions,
      staffMembers,
    };
  },
  ["dashboard-data"],
  { revalidate: CACHE_ONE_HOUR, tags: ["dashboard-data"] },
);

export async function getDashboardData(slug: string): Promise<DashboardData | null> {
  return getCachedDashboardData(slug);
}
