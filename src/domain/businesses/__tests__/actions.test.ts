import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const { rpcCallMock, fromMock } = vi.hoisted(() => ({
  rpcCallMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => ({
    rpc: vi.fn(),
    from: fromMock,
  }),
}));

vi.mock("@/lib/supabase/rpc", () => ({
  rpcCall: rpcCallMock,
}));

import { completeBusinessOnboarding, createBusiness } from "../actions";
import { rpcCall } from "@/lib/supabase/rpc";

describe("business actions", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
    fromMock.mockReset();
  });

  it("uses the provided slug when creating a business", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: {
        id: "biz-1",
        slug: "custom-slug",
        name: "Studio North",
        description: null,
        region_code: "test-region",
        timezone: "America/New_York",
        contact_email: "owner@example.com",
        contact_phone: null,
        is_onboarded: false,
        settings: {
          bookingWindowDays: 120,
          cancellationWindowHours: 4,
          bufferMinutes: 10,
          notifications: {
            email: true,
            sms: false,
          },
          publicBookingPage: {
            showBusinessName: true,
            serviceVisibility: "all",
            visibleServiceIds: [],
          },
        },
        created_at: "2026-04-16T12:00:00.000Z",
        updated_at: "2026-04-16T12:00:00.000Z",
      },
      error: null,
    });

    await createBusiness({
      slug: "custom-slug",
      name: "Studio North",
      regionCode: "test-region",
      timezone: "America/New_York",
      contactEmail: "owner@example.com",
    });

    expect(rpcCall).toHaveBeenCalledWith(expect.anything(), "create_business", {
      slug: "custom-slug",
      name: "Studio North",
      description: null,
      region_code: "test-region",
      timezone: "America/New_York",
      contact_email: "owner@example.com",
      contact_phone: null,
      settings: expect.any(Object),
    });
  });

  it("refuses onboarding completion when minimum requirements are missing", async () => {
    const businessQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "biz-1",
        },
        error: null,
      }),
    };
    const servicesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      mockResolvedValueOnce: vi.fn(),
      then: undefined,
    };
    const availabilityQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: undefined,
    };

    servicesQuery.eq.mockReturnValue(servicesQuery);
    servicesQuery.select.mockReturnValue(servicesQuery);
    availabilityQuery.eq.mockReturnValue(availabilityQuery);
    availabilityQuery.select.mockReturnValue(availabilityQuery);

    servicesQuery.eq
      .mockReturnValueOnce(servicesQuery)
      .mockReturnValueOnce(servicesQuery)
      .mockReturnValueOnce(Promise.resolve({
        count: 0,
        error: null,
      }));
    availabilityQuery.eq
      .mockReturnValueOnce(availabilityQuery)
      .mockReturnValueOnce(Promise.resolve({
        count: 1,
        error: null,
      }));

    fromMock
      .mockReturnValueOnce(businessQuery)
      .mockReturnValueOnce(servicesQuery)
      .mockReturnValueOnce(availabilityQuery);

    await expect(completeBusinessOnboarding("biz-1")).rejects.toBeInstanceOf(DomainError);
  });
});
