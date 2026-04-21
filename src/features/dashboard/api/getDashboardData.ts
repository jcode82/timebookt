"use server";

import { getBusinessBySlug, getBusinessDashboardMetrics } from "@/domain/businesses";
import { listAppointmentsForBusiness } from "@/domain/appointments";
import { listCustomers } from "@/domain/customers";

export interface DashboardData {
  businessId: string;
  businessName: string;
  slug: string;
  isOnboarded: boolean;
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
    businessId: business.id,
    businessName: business.name,
    slug: business.slug,
    isOnboarded: business.isOnboarded,
    metrics,
    appointments,
    customers,
  };
}
