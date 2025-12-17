import { TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { REGION } from "@/lib/env";
import type { Tables } from "../../../supabase/types";
import type { ServiceRecord } from "./types";

const mapService = (row: Tables<typeof TABLES.services>): ServiceRecord => ({
  id: row.id,
  businessId: row.business_id,
  name: row.name,
  description: row.description,
  durationMinutes: row.duration_minutes,
  priceCents: row.price_cents,
  currency: row.currency,
  isActive: row.is_active,
});

export async function listServicesForBusiness(businessId: string): Promise<ServiceRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.services)
    .select()
    .eq("business_id", businessId)
    .eq("region_code", REGION)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DomainError("Unable to load services", { error, businessId });
  }

  return (data ?? []).map(mapService);
}
