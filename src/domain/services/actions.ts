import { TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { REGION } from "@/lib/env";
import { rpcCall } from "@/lib/supabase/rpc";
import type { Json } from "../../../supabase/types";
import type { Tables } from "../../../supabase/types";
import type { CreateServiceInput, ListServicesOptions, ServiceRecord, UpdateServiceInput } from "./types";

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

export async function updateService(input: UpdateServiceInput): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
  const patch: Record<string, Json> = {};

  if (input.name !== undefined) {
    patch.name = input.name;
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }
  if (input.durationMinutes !== undefined) {
    patch.duration_minutes = input.durationMinutes;
  }
  if (input.priceCents !== undefined) {
    patch.price_cents = input.priceCents;
  }
  if (input.currency !== undefined) {
    patch.currency = input.currency;
  }
  if (input.isActive !== undefined) {
    patch.is_active = input.isActive;
  }

  const { data, error } = await rpcCall<Tables<typeof TABLES.services>>(supabase, "update_service", {
    service_id: input.serviceId,
    business_id: input.businessId,
    region_code: REGION,
    patch,
  });

  if (error) {
    console.error("services.update_failed", { error, input });

    if (error.message.includes("update_service")) {
      throw new DomainError(
        "Service updates are unavailable until the latest Supabase service RPC migration is applied",
        { error, input },
      );
    }

    throw new DomainError("Unable to update service", { error, input });
  }

  if (!data) {
    console.error("services.update_missing_record", { input, region: REGION });
    throw new DomainError(
      "Service update did not return a record. Confirm the service belongs to this business and region.",
      { input, region: REGION },
    );
  }

  return mapService(data);
}

export async function listServicesForBusiness(
  businessId: string,
  options: ListServicesOptions = {},
): Promise<ServiceRecord[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from(TABLES.services)
    .select()
    .eq("business_id", businessId)
    .eq("region_code", REGION)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (!options.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new DomainError("Unable to load services", { error, businessId, options });
  }

  return (data ?? []).map(mapService);
}
