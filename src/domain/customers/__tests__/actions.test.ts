import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => ({
    from: fromMock,
  }),
}));

import { listBookedCustomersForBusiness } from "../actions";

function makeQuery<T>(result: T) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: (resolve: (value: T) => unknown) => Promise.resolve(result).then(resolve),
  };
}

describe("customer actions", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("lists booked customers with booking counts", async () => {
    const appointmentsQuery = makeQuery({
      data: [
        {
          customer_id: "cust-1",
          start_time: "2026-05-02T13:00:00.000Z",
        },
        {
          customer_id: "cust-2",
          start_time: "2026-05-01T13:00:00.000Z",
        },
        {
          customer_id: "cust-1",
          start_time: "2026-04-30T13:00:00.000Z",
        },
      ],
      error: null,
    });
    const customersQuery = makeQuery({
      data: [
        {
          id: "cust-1",
          business_id: "biz-1",
          region_code: "test-region",
          full_name: "Jamie Fox",
          email: "jamie@example.com",
          phone: "555-0110",
          locale: null,
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-20T10:00:00.000Z",
        },
        {
          id: "cust-2",
          business_id: "biz-1",
          region_code: "test-region",
          full_name: "Morgan Lee",
          email: "morgan@example.com",
          phone: null,
          locale: null,
          created_at: "2026-04-21T10:00:00.000Z",
          updated_at: "2026-04-21T10:00:00.000Z",
        },
      ],
      error: null,
    });

    fromMock.mockReturnValueOnce(appointmentsQuery).mockReturnValueOnce(customersQuery);

    const result = await listBookedCustomersForBusiness({
      businessId: "biz-1",
      limit: 10,
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: "cust-1",
        fullName: "Jamie Fox",
        bookingCount: 2,
      }),
      expect.objectContaining({
        id: "cust-2",
        fullName: "Morgan Lee",
        bookingCount: 1,
      }),
    ]);
    expect(fromMock).toHaveBeenNthCalledWith(1, "appointments");
    expect(fromMock).toHaveBeenNthCalledWith(2, "customers");
    expect(customersQuery.in).toHaveBeenCalledWith("id", ["cust-1", "cust-2"]);
  });

  it("returns an empty list when the business has no appointments", async () => {
    const appointmentsQuery = makeQuery({
      data: [],
      error: null,
    });

    fromMock.mockReturnValueOnce(appointmentsQuery);

    const result = await listBookedCustomersForBusiness({
      businessId: "biz-1",
    });

    expect(result).toEqual([]);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
