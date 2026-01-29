import { describe, expect, it, vi } from "vitest";

const availabilityRow = {
  id: "block-1",
  business_id: "biz-1",
  staff_id: "staff-1",
  region_code: "test-region",
  day_of_week: 1,
  start_time: "2026-02-16T14:00:00.000Z",
  end_time: "2026-02-16T15:00:00.000Z",
  capacity: 1,
  created_at: "2026-02-01T00:00:00.000Z",
};

const appointmentRow = {
  id: "appt-1",
  start_time: "2026-02-16T14:00:00.000Z",
  end_time: "2026-02-16T14:30:00.000Z",
};

const buildQuery = (result: { data: unknown; error: unknown }) => {
  const query = {
    select: () => query,
    eq: () => query,
    neq: () => query,
    lt: () => query,
    gt: () => query,
    lte: () => query,
    gte: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: () => query,
    then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  } as const;
  return query;
};

const supabaseMock = {
  from: (table: string) => {
    if (table === "availability_blocks") {
      return buildQuery({ data: [availabilityRow], error: null });
    }
    if (table === "appointments") {
      return buildQuery({ data: [appointmentRow], error: null });
    }
    return buildQuery({ data: [], error: null });
  },
};

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => supabaseMock,
}));

import { getProviderAvailabilityForDate } from "../actions";

describe("getProviderAvailabilityForDate", () => {
  it("removes slots that overlap scheduled appointments", async () => {
    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
    ]);
  });
});
