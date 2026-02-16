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
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

vi.mock("@/lib/supabase/rpc", () => ({
  rpcCall: rpcCallMock,
}));

import { cancelAppointment } from "../actions";
import { rpcCall } from "@/lib/supabase/rpc";

describe("cancelAppointment", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
  });

  it("sends cancel_appointment with appointment_id, region_code, cancellation_reason", async () => {
    const appointmentRow = {
      id: "appt-1",
      business_id: "biz-1",
      customer_id: "cust-1",
      service_id: "svc-1",
      staff_id: "staff-1",
      region_code: "test-region",
      start_time: "2026-02-16T14:00:00.000Z",
      end_time: "2026-02-16T14:30:00.000Z",
      status: "canceled",
      cancellation_reason: "customer-requested",
      notes: null,
      created_at: "2026-02-01T10:00:00.000Z",
      updated_at: "2026-02-01T10:05:00.000Z",
    };

    rpcCallMock.mockResolvedValueOnce({ data: appointmentRow, error: null });

    const result = await cancelAppointment({
      appointmentId: "appt-1",
      cancellationReason: "customer-requested",
    });

    expect(rpcCall).toHaveBeenCalledWith(
      expect.anything(),
      "cancel_appointment",
      {
        appointment_id: "appt-1",
        region_code: "test-region",
        cancellation_reason: "customer-requested",
      },
    );

    expect(result.status).toBe("canceled");
    expect(result.cancellationReason).toBe("customer-requested");
  });

  it("throws DomainError when rpcCall returns an error", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed" },
    });

    await expect(
      cancelAppointment({ appointmentId: "appt-2" }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
