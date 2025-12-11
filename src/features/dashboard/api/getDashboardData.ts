"use server";

import { unstable_cache } from "next/cache";
import { CACHE_ONE_HOUR } from "@/features/dashboard/utils/constants";
import { getBusinessBySlug, getBusinessDashboardMetrics } from "@/domain/businesses";
import { listAppointmentsForBusiness } from "@/domain/appointments";
import { listCustomers } from "@/domain/customers";

export interface DashboardData {
  businessName: string;
  slug: string;
  metrics: Awaited<ReturnType<typeof getBusinessDashboardMetrics>>;
  appointments: Awaited<ReturnType<typeof listAppointmentsForBusiness>>;
  customers: Awaited<ReturnType<typeof listCustomers>>;
}

const cachedDashboard = unstable_cache(
  async (slug: string): Promise<DashboardData> => {
    const business = await getBusinessBySlug(slug);
    if (!business) {
      throw new Error(`Business not found for slug ${slug}`);
    }

    const [metrics, appointments, customers] = await Promise.all([
      getBusinessDashboardMetrics(business.id),
      listAppointmentsForBusiness(business.id),
      listCustomers({ businessId: business.id, limit: 5 }),
    ]);

    return {
      businessName: business.name,
      slug: business.slug,
      metrics,
      appointments,
      customers,
    };
  },
  ["dashboard-data"],
  { revalidate: CACHE_ONE_HOUR },
);

export async function getDashboardData(slug: string): Promise<DashboardData> {
  return cachedDashboard(slug);
}
