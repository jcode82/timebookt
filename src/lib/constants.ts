export const APP_NAME = "TimeBookt";
export const REGION_ENV_KEY = "NEXT_PUBLIC_TIMEBOOKT_REGION";
export const DEFAULT_REGION = "global";
export const BUSINESS_BOOKING_SEGMENT = "book";
export const DEFAULT_BOOKING_WINDOW_DAYS = 120;
export const DEFAULT_CANCELLATION_WINDOW_HOURS = 4;
export const DEFAULT_TIMEZONE = "America/New_York";
// export const DEMO_BUSINESS_SLUG = "demo-spa-nyc";
export const DEMO_BUSINESS_SLUG = "miami-apt-cleaning-fl";

export const TABLES = {
  businesses: "businesses",
  services: "services",
  staff: "staff",
  availabilityBlocks: "availability_blocks",
  appointments: "appointments",
  appointmentReminderEvents: "appointment_reminder_events",
  customers: "customers",
  templates: "templates",
  auditLogs: "audit_logs",
} as const;

export const REGION_HEADERS = {
  city: "x-timebookt-city",
  country: "x-timebookt-country",
};

export const DASHBOARD_LIMITS = {
  appointments: 20,
  auditLogs: 10,
};

export const BOOKING_STEPS = ["selectService", "selectProvider", "selectSlot", "confirm"] as const;

export const TEMPLATE_CHANNELS = ["email", "sms"] as const;
