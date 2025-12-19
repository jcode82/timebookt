"use server";

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

export async function getDashboardData(slug: string): Promise<DashboardData | null> {
  const business = await getBusinessBySlug(slug);
  if (!business) {
    return null;
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
}
