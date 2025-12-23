"use server";

import { getSupabaseAdmin } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import { REGION } from "@/lib/env";
import { getBusinessBySlug } from "@/domain/businesses";
import { listServicesForBusiness } from "@/domain/services";

export async function getBookingContext(slug: string) {
  const business = await getBusinessBySlug(slug);
  if (!business) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const [services, providersRes] = await Promise.all([
    listServicesForBusiness(business.id),
    supabase
      .from(TABLES.staff)
      .select("id, full_name")
      .eq("business_id", business.id)
      .eq("region_code", REGION)
      .order("created_at", { ascending: true }),
  ]);

  if (providersRes.error) {
    throw providersRes.error;
  }

  const providers = (providersRes.data ?? []).map((provider) => ({
    id: provider.id,
    name: provider.full_name,
  }));

  return { business, services, providers };
}
