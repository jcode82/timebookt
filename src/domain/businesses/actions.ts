import { DASHBOARD_LIMITS, DEFAULT_BOOKING_WINDOW_DAYS, DEFAULT_CANCELLATION_WINDOW_HOURS, TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { toSlug } from "@/lib/utils/slug";
import { REGION } from "@/lib/env";
import type { Tables, TablesInsert } from "../../../supabase/types";
import type { BusinessDashboardMetrics, BusinessProfile, BusinessSettings, CreateBusinessInput } from "./types";

const defaultSettings = (): BusinessSettings => ({
  bookingWindowDays: DEFAULT_BOOKING_WINDOW_DAYS,
  cancellationWindowHours: DEFAULT_CANCELLATION_WINDOW_HOURS,
  bufferMinutes: 10,
  notifications: {
    email: true,
    sms: false,
  },
});

const isBusinessSettings = (value: unknown): value is BusinessSettings => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<BusinessSettings>;
  const notifications = candidate.notifications as Partial<BusinessSettings["notifications"]> | undefined;
  return (
    typeof candidate.bookingWindowDays === "number" &&
    typeof candidate.cancellationWindowHours === "number" &&
    typeof candidate.bufferMinutes === "number" &&
    notifications !== undefined &&
    typeof notifications.email === "boolean" &&
    typeof notifications.sms === "boolean"
  );
};

const mapBusiness = (row: Tables<typeof TABLES.businesses>): BusinessProfile => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  regionCode: row.region_code,
  timezone: row.timezone,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone,
  settings: isBusinessSettings(row.settings) ? row.settings : defaultSettings(),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function createBusiness(payload: CreateBusinessInput): Promise<BusinessProfile> {
  const supabase = getSupabaseAdmin();
  if (payload.regionCode !== REGION) {
    throw new DomainError("Region mismatch during business creation", {
      requestedRegion: payload.regionCode,
      region: REGION,
    });
  }
  const slug = `${toSlug(payload.name)}-${toSlug(payload.regionCode)}`;

  const insert: TablesInsert<typeof TABLES.businesses> = {
    slug,
    name: payload.name,
    description: payload.description,
    region_code: REGION,
    timezone: payload.timezone,
    contact_email: payload.contactEmail,
    contact_phone: payload.contactPhone,
    settings: defaultSettings(),
  };

  const { data, error } = await supabase
    .from(TABLES.businesses)
    .insert(insert)
    .select()
    .single();

  if (error || !data) {
    throw new DomainError("Unable to create business", { error });
  }

  return mapBusiness(data);
}

export async function getBusinessBySlug(slug: string): Promise<BusinessProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.businesses)
    .select()
    .eq("slug", slug)
    .eq("region_code", REGION)
    .maybeSingle();

  if (error) {
    throw new DomainError("Unable to load business", { error, slug });
  }

  return data ? mapBusiness(data) : null;
}

export async function listBusinessesByRegion(regionCode: string): Promise<BusinessProfile[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.businesses)
    .select()
    .eq("region_code", regionCode)
    .eq("region_code", REGION)
    .order("created_at", { ascending: false });

  if (error) {
    throw new DomainError("Unable to list businesses", { error, regionCode });
  }

  return (data ?? []).map(mapBusiness);
}

export async function getBusinessDashboardMetrics(businessId: string): Promise<BusinessDashboardMetrics> {
  const supabase = getSupabaseAdmin();
  const [totalRes, upcomingRes, customersRes, auditLogRes] = await Promise.all([
    supabase
      .from(TABLES.appointments)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("region_code", REGION),
    supabase
      .from(TABLES.appointments)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "scheduled")
      .eq("region_code", REGION)
      .gte("start_time", new Date().toISOString()),
    supabase
      .from(TABLES.customers)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("region_code", REGION),
    supabase
      .from(TABLES.auditLogs)
      .select("id, action, created_at")
      .eq("business_id", businessId)
      .eq("region_code", REGION)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_LIMITS.auditLogs),
  ]);

  if (totalRes.error || upcomingRes.error || customersRes.error || auditLogRes.error) {
    throw new DomainError("Unable to load dashboard metrics", {
      totalError: totalRes.error,
      upcomingError: upcomingRes.error,
      customersError: customersRes.error,
      auditError: auditLogRes.error,
    });
  }

  return {
    totalAppointments: totalRes.count ?? 0,
    upcomingAppointments: upcomingRes.count ?? 0,
    activeCustomers: customersRes.count ?? 0,
    recentAuditLog: (auditLogRes.data ?? []).map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.created_at,
    })),
  };
}
