import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcCallMock } = vi.hoisted(() => ({
  rpcCallMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => ({
    rpc: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/rpc", () => ({
  rpcCall: rpcCallMock,
}));

import { createService, updateService } from "../actions";
import { rpcCall } from "@/lib/supabase/rpc";

describe("createService", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
  });

  it("sends create_service with the expected RPC payload", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: {
        id: "svc-1",
        business_id: "biz-1",
        region_code: "test-region",
        name: "Initial Consultation",
        description: "First session",
        duration_minutes: 60,
        price_cents: 12000,
        currency: "USD",
        is_active: true,
        created_at: "2026-04-16T10:00:00.000Z",
        updated_at: "2026-04-16T10:00:00.000Z",
      },
      error: null,
    });

    const service = await createService({
      businessId: "biz-1",
      name: "Initial Consultation",
      description: "First session",
      durationMinutes: 60,
      priceCents: 12000,
    });

    expect(rpcCall).toHaveBeenCalledWith(expect.anything(), "create_service", {
      business_id: "biz-1",
      region_code: "test-region",
      name: "Initial Consultation",
      description: "First session",
      duration_minutes: 60,
      price_cents: 12000,
      currency: "USD",
    });
    expect(service.id).toBe("svc-1");
    expect(service.durationMinutes).toBe(60);
  });

  it("sends update_service with the expected RPC payload", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: {
        id: "svc-1",
        business_id: "biz-1",
        region_code: "test-region",
        name: "Follow-up Session",
        description: null,
        duration_minutes: 45,
        price_cents: 9500,
        currency: "USD",
        is_active: false,
        created_at: "2026-04-16T10:00:00.000Z",
        updated_at: "2026-04-26T09:00:00.000Z",
      },
      error: null,
    });

    const service = await updateService({
      serviceId: "svc-1",
      businessId: "biz-1",
      name: "Follow-up Session",
      durationMinutes: 45,
      priceCents: 9500,
      isActive: false,
    });

    expect(rpcCall).toHaveBeenCalledWith(expect.anything(), "update_service", {
      service_id: "svc-1",
      business_id: "biz-1",
      region_code: "test-region",
      patch: {
        name: "Follow-up Session",
        duration_minutes: 45,
        price_cents: 9500,
        is_active: false,
      },
    });
    expect(service.name).toBe("Follow-up Session");
    expect(service.isActive).toBe(false);
  });

  it("surfaces a migration-specific message when update_service is unavailable", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Could not find the function public.update_service(service_id, business_id, region_code, patch)",
      },
    });

    await expect(
      updateService({
        serviceId: "svc-1",
        businessId: "biz-1",
        isActive: false,
      }),
    ).rejects.toThrow(
      "Service updates are unavailable until the latest Supabase service RPC migration is applied",
    );
  });
});
