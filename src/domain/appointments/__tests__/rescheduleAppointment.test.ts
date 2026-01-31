import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const { rpcCallMock } = vi.hoisted(() => ({
  rpcCallMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => ({}),
}));

vi.mock("@/lib/supabase/rpc", () => ({
  rpcCall: rpcCallMock,
}));

import { rescheduleAppointment } from "../actions";
import { rpcCall } from "@/lib/supabase/rpc";

describe("rescheduleAppointment", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-10T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends reschedule_appointment with appointment_id and new times", async () => {
    const appointmentRow = {
      id: "appt-1",
      business_id: "biz-1",
      customer_id: "cust-1",
      service_id: "svc-1",
      staff_id: "staff-1",
      region_code: "test-region",
      start_time: "2026-02-20T14:00:00.000Z",
      end_time: "2026-02-20T14:30:00.000Z",
      status: "scheduled",
      cancellation_reason: null,
      notes: null,
      created_at: "2026-02-01T10:00:00.000Z",
      updated_at: "2026-02-10T10:05:00.000Z",
    };

    rpcCallMock.mockResolvedValueOnce({ data: appointmentRow, error: null });

    const result = await rescheduleAppointment({
      appointmentId: "appt-1",
      startTime: "2026-02-20T14:00:00.000Z",
      endTime: "2026-02-20T14:30:00.000Z",
      reason: "customer-requested",
      source: "api",
    });

    expect(rpcCall).toHaveBeenCalledWith(
      expect.anything(),
      "reschedule_appointment",
      {
        p_appointment_id: "appt-1",
        p_region_code: "test-region",
        p_new_start_time: "2026-02-20T14:00:00.000Z",
        p_new_end_time: "2026-02-20T14:30:00.000Z",
        p_reason: "customer-requested",
        p_source: "api",
      },
    );

    expect(result.id).toBe("appt-1");
    expect(result.startTime).toBe("2026-02-20T14:00:00.000Z");
    expect(result.endTime).toBe("2026-02-20T14:30:00.000Z");
  });

  it("throws DomainError when reschedule overlaps another appointment", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "Appointment capacity exceeded" },
    });

    await expect(
      rescheduleAppointment({
        appointmentId: "appt-2",
        startTime: "2026-02-20T15:00:00.000Z",
        endTime: "2026-02-20T15:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("throws DomainError when rescheduling a canceled appointment", async () => {
    rpcCallMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Cannot reschedule a canceled appointment" },
    });

    await expect(
      rescheduleAppointment({
        appointmentId: "appt-3",
        startTime: "2026-02-21T09:00:00.000Z",
        endTime: "2026-02-21T09:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejects invalid time ranges", async () => {
    await expect(
      rescheduleAppointment({
        appointmentId: "appt-4",
        startTime: "2026-02-21T09:30:00.000Z",
        endTime: "2026-02-21T09:30:00.000Z",
      }),
    ).rejects.toBeInstanceOf(DomainError);

    expect(rpcCallMock).not.toHaveBeenCalled();
  });
});
