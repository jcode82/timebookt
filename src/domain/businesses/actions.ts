import { DASHBOARD_LIMITS, DEFAULT_BOOKING_WINDOW_DAYS, DEFAULT_CANCELLATION_WINDOW_HOURS, TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { rpcCall } from "@/lib/supabase/rpc";
import { toSlug } from "@/lib/utils/slug";
import { REGION } from "@/lib/env";
import type { Tables, TablesInsert } from "../../../supabase/types";
import type {
  BusinessDashboardMetrics,
  BusinessProfile,
  BusinessSettings,
  CreateBusinessInput,
  StaffMember,
} from "./types";

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
  isOnboarded: row.is_onboarded,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapStaffMember = (row: Tables<typeof TABLES.staff>): StaffMember => ({
  id: row.id,
  businessId: row.business_id,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
});

export async function createBusiness(payload: CreateBusinessInput): Promise<BusinessProfile> {
  const supabase = getSupabaseAdmin();
  if (payload.regionCode !== REGION) {
    throw new DomainError("Region mismatch during business creation", {
      requestedRegion: payload.regionCode,
      region: REGION,
    });
  }
  const slug = payload.slug ? toSlug(payload.slug) : `${toSlug(payload.name)}-${toSlug(payload.regionCode)}`;

  const insert: TablesInsert<typeof TABLES.businesses> = {
    slug,
    name: payload.name,
    description: payload.description,
    region_code: REGION,
    timezone: payload.timezone,
    contact_email: payload.contactEmail,
    contact_phone: payload.contactPhone,
    settings: defaultSettings() as unknown as TablesInsert<typeof TABLES.businesses>["settings"],
  };

  const { data, error } = await rpcCall<Tables<typeof TABLES.businesses>>(supabase, "create_business", {
    slug: insert.slug,
    name: insert.name,
    description: insert.description ?? null,
    region_code: insert.region_code ?? REGION,
    timezone: insert.timezone,
    contact_email: insert.contact_email,
    contact_phone: insert.contact_phone ?? null,
    settings: insert.settings,
  });

  if (error || !data) {
    throw new DomainError("Unable to create business", { error });
  }

  return mapBusiness(data);
}

export async function completeBusinessOnboarding(businessId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: business, error: businessError } = await supabase
    .from(TABLES.businesses)
    .select("id")
    .eq("id", businessId)
    .eq("region_code", REGION)
    .maybeSingle();

  if (businessError || !business) {
    throw new DomainError("Unable to load business for onboarding completion", {
      businessId,
      error: businessError,
    });
  }

  const [servicesRes, availabilityRes] = await Promise.all([
    supabase
      .from(TABLES.services)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("region_code", REGION)
      .eq("is_active", true),
    supabase
      .from(TABLES.availabilityBlocks)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("region_code", REGION),
  ]);

  if (servicesRes.error || availabilityRes.error) {
    throw new DomainError("Unable to validate onboarding requirements", {
      businessId,
      servicesError: servicesRes.error,
      availabilityError: availabilityRes.error,
    });
  }

  if ((servicesRes.count ?? 0) < 1 || (availabilityRes.count ?? 0) < 1) {
    throw new DomainError("At least one service and one availability block are required");
  }

  const { error: updateError } = await supabase
    .from(TABLES.businesses)
    .update({
      is_onboarded: true,
    })
    .eq("id", businessId)
    .eq("region_code", REGION);

  if (updateError) {
    throw new DomainError("Unable to persist onboarding completion", {
      businessId,
      error: updateError,
    });
  }
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

export async function listStaffForBusiness(businessId: string): Promise<StaffMember[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.staff)
    .select()
    .eq("business_id", businessId)
    .eq("region_code", REGION)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DomainError("Unable to list staff members", { error, businessId });
  }

  return (data ?? []).map(mapStaffMember);
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
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const startOfWeek = new Date(startOfToday);
  const dayOfWeek = startOfWeek.getDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const activeBookingStatuses = ["scheduled", "completed"] as const;

  const [totalRes, todayRes, weekRes, upcomingRes, customersRes, auditLogRes] = await Promise.all([
    supabase
      .from(TABLES.appointments)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("region_code", REGION),
    supabase
      .from(TABLES.appointments)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("region_code", REGION)
      .in("status", [...activeBookingStatuses])
      .gte("start_time", startOfToday.toISOString())
      .lt("start_time", endOfToday.toISOString()),
    supabase
      .from(TABLES.appointments)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("region_code", REGION)
      .in("status", [...activeBookingStatuses])
      .gte("start_time", startOfWeek.toISOString())
      .lt("start_time", endOfWeek.toISOString()),
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

  if (totalRes.error || todayRes.error || weekRes.error || upcomingRes.error || customersRes.error || auditLogRes.error) {
    throw new DomainError("Unable to load dashboard metrics", {
      totalError: totalRes.error,
      todayError: todayRes.error,
      weekError: weekRes.error,
      upcomingError: upcomingRes.error,
      customersError: customersRes.error,
      auditError: auditLogRes.error,
    });
  }

  const auditLogRows = (auditLogRes.data ?? []) as Tables<typeof TABLES.auditLogs>[];

  return {
    totalAppointments: totalRes.count ?? 0,
    bookingsToday: todayRes.count ?? 0,
    bookingsThisWeek: weekRes.count ?? 0,
    upcomingAppointments: upcomingRes.count ?? 0,
    activeCustomers: customersRes.count ?? 0,
    recentAuditLog: auditLogRows.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.created_at,
    })),
  };
}
