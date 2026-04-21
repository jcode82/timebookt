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

import { createService } from "../actions";
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
});
