import { TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { REGION } from "@/lib/env";
import { rpcCall } from "@/lib/supabase/rpc";
import type { Tables } from "../../../supabase/types";
import type { CreateServiceInput, ServiceRecord } from "./types";

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

export async function createService(input: CreateServiceInput): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await rpcCall<Tables<typeof TABLES.services>>(supabase, "create_service", {
    business_id: input.businessId,
    region_code: REGION,
    name: input.name,
    description: input.description ?? null,
    duration_minutes: input.durationMinutes,
    price_cents: input.priceCents,
    currency: input.currency ?? "USD",
  });

  if (error || !data) {
    throw new DomainError("Unable to create service", { error, input });
  }

  return mapService(data);
}

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
