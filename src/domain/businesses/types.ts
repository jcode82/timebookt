import type { Json } from "../../../supabase/types";

export interface PublicBookingPageSettings {
  showBusinessName: boolean;
  serviceVisibility: "all" | "selected";
  visibleServiceIds: string[];
}

export interface BusinessSettings {
  bookingWindowDays: number;
  cancellationWindowHours: number;
  bufferMinutes: number;
  notifications: {
    email: boolean;
    sms: boolean;
  };
  publicBookingPage: PublicBookingPageSettings;
}

export interface BusinessProfile {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  regionCode: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string | null;
  settings: BusinessSettings;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessInput {
  slug?: string;
  name: string;
  regionCode: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
}

export interface BusinessDashboardMetrics {
  totalAppointments: number;
  bookingsToday: number;
  bookingsThisWeek: number;
  upcomingAppointments: number;
  activeCustomers: number;
  recentAuditLog: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
}

export interface StaffMember {
  id: string;
  businessId: string;
  fullName: string;
  email?: string | null;
  role: string;
}

export interface ServiceSummary {
  id: string;
  businessId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export type SerializableSettings = Json;
