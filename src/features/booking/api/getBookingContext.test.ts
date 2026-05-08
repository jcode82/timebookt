import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBusinessBySlugMock, listServicesForBusinessMock, fromMock } = vi.hoisted(() => ({
  getBusinessBySlugMock: vi.fn(),
  listServicesForBusinessMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/domain/businesses", () => ({
  getBusinessBySlug: getBusinessBySlugMock,
}));

vi.mock("@/domain/services/actions", () => ({
  listServicesForBusiness: listServicesForBusinessMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => ({
    from: fromMock,
  }),
}));

import { getBookingContext } from "./getBookingContext";

describe("getBookingContext", () => {
  beforeEach(() => {
    getBusinessBySlugMock.mockReset();
    listServicesForBusinessMock.mockReset();
    fromMock.mockReset();
  });

  it("filters services when the booking page is configured to show a selected subset", async () => {
    getBusinessBySlugMock.mockResolvedValueOnce({
      id: "biz-1",
      slug: "studio-north",
      name: "Studio North",
      description: null,
      timezone: "America/New_York",
      settings: {
        publicBookingPage: {
          showBusinessName: true,
          serviceVisibility: "selected",
          visibleServiceIds: ["svc-2"],
        },
      },
    });
    listServicesForBusinessMock.mockResolvedValueOnce([
      {
        id: "svc-1",
        businessId: "biz-1",
        name: "Initial Consultation",
        durationMinutes: 60,
        priceCents: 10000,
        currency: "USD",
        isActive: true,
      },
      {
        id: "svc-2",
        businessId: "biz-1",
        name: "Follow-up",
        durationMinutes: 30,
        priceCents: 7000,
        currency: "USD",
        isActive: true,
      },
    ]);

    const providersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: "staff-1", full_name: "Taylor Stylist" }],
        error: null,
      }),
    };
    fromMock.mockReturnValueOnce(providersQuery);

    const result = await getBookingContext("studio-north");

    expect(result?.services).toEqual([
      expect.objectContaining({
        id: "svc-2",
        name: "Follow-up",
      }),
    ]);
    expect(result?.providers).toEqual([{ id: "staff-1", name: "Taylor Stylist" }]);
  });
});
