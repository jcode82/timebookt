import type { Json } from "../../../supabase/types";

export interface BusinessSettings {
  bookingWindowDays: number;
  cancellationWindowHours: number;
  bufferMinutes: number;
  notifications: {
    email: boolean;
    sms: boolean;
  };
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessInput {
  name: string;
  regionCode: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
}

export interface BusinessDashboardMetrics {
  totalAppointments: number;
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
