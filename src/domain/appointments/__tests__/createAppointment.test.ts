import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

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

import { createAppointment } from "../actions";
import { rpcCall } from "@/lib/supabase/rpc";

describe("createAppointment", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
  });

  it("sends create_appointment with the expected RPC payload", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: {
        id: "appt-1",
        business_id: "biz-1",
        customer_id: "cust-1",
        service_id: "svc-1",
        staff_id: "staff-1",
        region_code: "test-region",
        start_time: "2026-02-20T14:00:00.000Z",
        end_time: "2026-02-20T14:30:00.000Z",
        status: "scheduled",
        notes: "Window seat",
        cancellation_reason: null,
        created_at: "2026-02-01T10:00:00.000Z",
        updated_at: "2026-02-01T10:00:00.000Z",
      },
      error: null,
    });

    const result = await createAppointment({
      businessId: "biz-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      staffId: "staff-1",
      startTime: "2026-02-20T14:00:00.000Z",
      endTime: "2026-02-20T14:30:00.000Z",
      notes: "Window seat",
    });

    expect(rpcCall).toHaveBeenCalledWith(expect.anything(), "create_appointment", {
      p_business_id: "biz-1",
      p_customer_id: "cust-1",
      p_service_id: "svc-1",
      p_region_code: "test-region",
      p_start_time: "2026-02-20T14:00:00.000Z",
      p_end_time: "2026-02-20T14:30:00.000Z",
      p_staff_id: "staff-1",
      p_notes: "Window seat",
    });

    expect(result.id).toBe("appt-1");
    expect(result.startTime).toBe("2026-02-20T14:00:00.000Z");
    expect(result.endTime).toBe("2026-02-20T14:30:00.000Z");
  });

  it("maps capacity enforcement failures to a scheduling DomainError", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "Appointment capacity exceeded" },
    });

    await expect(
      createAppointment({
        businessId: "biz-1",
        customerId: "cust-1",
        serviceId: "svc-1",
        staffId: "staff-1",
        startTime: "2026-02-20T14:00:00.000Z",
        endTime: "2026-02-20T14:30:00.000Z",
      }),
    ).rejects.toMatchObject({
      message: "Appointment overlaps an existing booking",
    } satisfies Partial<DomainError>);
  });

  it("maps exception precedence availability failures to the same scheduling DomainError", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "Appointment outside availability" },
    });

    await expect(
      createAppointment({
        businessId: "biz-1",
        customerId: "cust-1",
        serviceId: "svc-1",
        staffId: "staff-1",
        startTime: "2026-02-20T14:00:00.000Z",
        endTime: "2026-02-20T14:30:00.000Z",
      }),
    ).rejects.toMatchObject({
      message: "Appointment overlaps an existing booking",
    } satisfies Partial<DomainError>);
  });
});
