import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("@/lib/email/sendAppointmentReminderEmail", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/email/sendAppointmentReminderEmail")
  >("@/lib/email/sendAppointmentReminderEmail");

  return {
    ...actual,
    sendAppointmentReminderEmail: (
      ...args: Parameters<typeof actual.sendAppointmentReminderEmail>
    ) => sendMock(...args),
  };
});

let GET: typeof import("../route").GET;
let supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseAdmin>;
let ProviderConfigurationError: typeof import("@/lib/email/sendAppointmentReminderEmail").ProviderConfigurationError;
let region = "global";
let businessId: string | null = null;

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const callReminders = async () => {
  const secret = process.env.CRON_SECRET ?? "";
  const request = new Request("http://localhost:3000/api/reminders", {
    headers: {
      authorization: `Bearer ${secret}`,
    },
  });
  const response = await GET(request);
  const json = await response.json();
  return { response, json };
};

const seedAppointment = async (startTimeIso: string) => {
  const slug = `tbkt-67-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const contactEmail = `owner+${slug}@example.com`;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      slug,
      name: "Reminder Test Biz",
      contact_email: contactEmail,
      region_code: region,
    })
    .select("id")
    .single();

  if (businessError || !business) {
    throw new Error(`Failed to create business: ${businessError?.message ?? "unknown"}`);
  }

  businessId = business.id;

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .insert({
      business_id: business.id,
      region_code: region,
      full_name: "Reminder Staff",
      email: "staff@example.com",
    })
    .select("id")
    .single();

  if (staffError || !staff) {
    throw new Error(`Failed to create staff: ${staffError?.message ?? "unknown"}`);
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .insert({
      business_id: business.id,
      region_code: region,
      name: "Reminder Service",
      duration_minutes: 30,
      price_cents: 5000,
      currency: "USD",
    })
    .select("id")
    .single();

  if (serviceError || !service) {
    throw new Error(`Failed to create service: ${serviceError?.message ?? "unknown"}`);
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      business_id: business.id,
      region_code: region,
      full_name: "Reminder Customer",
      email: `customer+${slug}@example.com`,
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    throw new Error(`Failed to create customer: ${customerError?.message ?? "unknown"}`);
  }

  const startTime = new Date(startTimeIso);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000).toISOString();

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      business_id: business.id,
      customer_id: customer.id,
      service_id: service.id,
      staff_id: staff.id,
      region_code: region,
      start_time: startTime.toISOString(),
      end_time: endTime,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    throw new Error(`Failed to create appointment: ${appointmentError?.message ?? "unknown"}`);
  }

  return appointment.id;
};

const fetchReminderEvents = async (appointmentId: string) => {
  const { data, error } = await supabase
    .from("appointment_reminder_events")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to query reminder events: ${error.message}`);
  }
  return data ?? [];
};

describe("reminders route integration", () => {
  beforeAll(async () => {
    requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    process.env.CRON_SECRET ??= "test-cron-secret";
    process.env.NEXT_PUBLIC_TIMEBOOKT_REGION ??= `test-${Date.now()}`;
    region = process.env.NEXT_PUBLIC_TIMEBOOKT_REGION ?? "global";

    const { getSupabaseAdmin } = await import("@/lib/supabase/client");
    supabase = getSupabaseAdmin();

    ({ GET } = await import("../route"));
    ({ ProviderConfigurationError } = await import("@/lib/email/sendAppointmentReminderEmail"));
  });

  beforeEach(() => {
    sendMock.mockReset();
    businessId = null;
  });

  afterEach(async () => {
    if (businessId) {
      await supabase.from("businesses").delete().eq("id", businessId);
      businessId = null;
    }
  });

  it("sends once and dedupes subsequent runs", async () => {
    sendMock.mockResolvedValue({ messageId: "test-msg-123" });

    const windowResponse = await callReminders();
    expect(windowResponse.response.status).toBe(200);
    const { windowStart, windowEnd } = windowResponse.json;

    const midpoint = new Date(
      (Date.parse(windowStart) + Date.parse(windowEnd)) / 2,
    ).toISOString();
    const appointmentId = await seedAppointment(midpoint);

    const firstRun = await callReminders();
    expect(firstRun.json.summary.sent).toBe(1);

    const eventsAfterFirst = await fetchReminderEvents(appointmentId);
    expect(eventsAfterFirst).toHaveLength(1);
    expect(eventsAfterFirst[0].status).toBe("sent");
    expect(eventsAfterFirst[0].provider_message_id).toBe("test-msg-123");
    expect(eventsAfterFirst[0].attempt_count).toBe(1);

    const secondRun = await callReminders();
    expect(secondRun.json.summary.skipped_already_sent).toBe(1);

    const eventsAfterSecond = await fetchReminderEvents(appointmentId);
    expect(eventsAfterSecond).toHaveLength(1);
  });

  it("marks permanent failure when provider config is missing", async () => {
    sendMock.mockRejectedValue(new ProviderConfigurationError("missing config"));

    const windowResponse = await callReminders();
    const { windowStart, windowEnd } = windowResponse.json;

    const midpoint = new Date(
      (Date.parse(windowStart) + Date.parse(windowEnd)) / 2,
    ).toISOString();
    const appointmentId = await seedAppointment(midpoint);

    const run = await callReminders();
    expect(run.json.summary.failed).toBe(1);

    const events = await fetchReminderEvents(appointmentId);
    expect(events).toHaveLength(1);
    // Terminal status is stored on the event row, while the route reports "failed" in summary.
    expect(events[0].status).toBe("failed");
    expect(events[0].next_attempt_at).toBeNull();
    expect(events[0].provider_message_id).toBeNull();
    expect(events[0].attempt_count).toBe(1);
  });
});
