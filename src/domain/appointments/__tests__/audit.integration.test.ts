import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const { rpcCallMock, getSupabaseAdminMock } = vi.hoisted(() => ({
  rpcCallMock: vi.fn(),
  getSupabaseAdminMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

vi.mock("@/lib/supabase/rpc", () => ({
  rpcCall: rpcCallMock,
}));

import { cancelAppointment, rescheduleAppointment } from "../actions";
import { listAppointmentAuditLogsForSupport } from "../audit";

type AuditInsertRow = {
  appointment_id: string;
  event_type: string;
  occurred_at: string;
  actor_type: string;
  actor_id: string | null;
  metadata: unknown;
};

const makeSupabaseMock = (options?: {
  auditInsertError?: boolean;
  auditRows?: AuditInsertRow[];
  previousTimes?: { start_time: string; end_time: string } | null;
  selectError?: unknown | null;
}) => {
  const auditRows = options?.auditRows ?? [];
  const previousTimes = options?.previousTimes ?? null;
  const selectError = options?.selectError ?? null;

  return {
    from: (table: string) => {
      if (table === "appointment_audit_logs") {
        return {
          insert: async (row: AuditInsertRow) => {
            if (options?.auditInsertError) {
              return { error: { message: "insert_failed" } };
            }
            auditRows.push(row);
            return { error: null };
          },
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  data: auditRows,
                  error: selectError,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "appointments") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: previousTimes,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      return {};
    },
  };
};

describe("appointment audit logging", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
    getSupabaseAdminMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-10T10:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes an audit log when cancelling an appointment", async () => {
    const auditRows: AuditInsertRow[] = [];
    getSupabaseAdminMock.mockReturnValue(makeSupabaseMock({ auditRows }));

    rpcCallMock.mockResolvedValueOnce({
      data: {
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
      },
      error: null,
    });

    await cancelAppointment({
      appointmentId: "appt-1",
      cancellationReason: "customer-requested",
      actorType: "staff",
      actorId: "staff-1",
    });

    expect(auditRows.length).toBeGreaterThan(0);
    expect(auditRows[0]).toEqual(
      expect.objectContaining({
        appointment_id: "appt-1",
        event_type: "cancelled",
        actor_type: "staff",
        actor_id: "staff-1",
      }),
    );
  });

  it("writes rescheduled audit log metadata with old/new times", async () => {
    const auditRows: AuditInsertRow[] = [];
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseMock({
        auditRows,
        previousTimes: {
          start_time: "2026-02-20T14:00:00.000Z",
          end_time: "2026-02-20T14:30:00.000Z",
        },
      }),
    );

    rpcCallMock.mockResolvedValueOnce({
      data: {
        id: "appt-2",
        business_id: "biz-1",
        customer_id: "cust-1",
        service_id: "svc-1",
        staff_id: "staff-1",
        region_code: "test-region",
        start_time: "2026-02-20T15:00:00.000Z",
        end_time: "2026-02-20T15:30:00.000Z",
        status: "scheduled",
        cancellation_reason: null,
        notes: null,
        created_at: "2026-02-01T10:00:00.000Z",
        updated_at: "2026-02-10T10:05:00.000Z",
      },
      error: null,
    });

    await rescheduleAppointment({
      appointmentId: "appt-2",
      startTime: "2026-02-20T15:00:00.000Z",
      endTime: "2026-02-20T15:30:00.000Z",
      reason: "customer-requested",
      source: "api",
      actorType: "staff",
      actorId: "staff-1",
    });

    expect(auditRows.length).toBeGreaterThan(0);
    expect(auditRows[0]).toEqual(
      expect.objectContaining({
        appointment_id: "appt-2",
        event_type: "rescheduled",
      }),
    );
    expect(auditRows[0].metadata).toEqual(
      expect.objectContaining({
        from_start_time: "2026-02-20T14:00:00.000Z",
        from_end_time: "2026-02-20T14:30:00.000Z",
        to_start_time: "2026-02-20T15:00:00.000Z",
        to_end_time: "2026-02-20T15:30:00.000Z",
      }),
    );
  });

  it("does not fail cancel/reschedule when audit insert fails", async () => {
    getSupabaseAdminMock.mockReturnValue(makeSupabaseMock({ auditInsertError: true }));

    rpcCallMock.mockResolvedValueOnce({
      data: {
        id: "appt-3",
        business_id: "biz-1",
        customer_id: "cust-1",
        service_id: "svc-1",
        staff_id: "staff-1",
        region_code: "test-region",
        start_time: "2026-02-16T14:00:00.000Z",
        end_time: "2026-02-16T14:30:00.000Z",
        status: "canceled",
        cancellation_reason: null,
        notes: null,
        created_at: "2026-02-01T10:00:00.000Z",
        updated_at: "2026-02-01T10:05:00.000Z",
      },
      error: null,
    });

    await expect(
      cancelAppointment({ appointmentId: "appt-3" }),
    ).resolves.toBeDefined();

    rpcCallMock.mockResolvedValueOnce({
      data: {
        id: "appt-4",
        business_id: "biz-1",
        customer_id: "cust-1",
        service_id: "svc-1",
        staff_id: "staff-1",
        region_code: "test-region",
        start_time: "2026-02-20T15:00:00.000Z",
        end_time: "2026-02-20T15:30:00.000Z",
        status: "scheduled",
        cancellation_reason: null,
        notes: null,
        created_at: "2026-02-01T10:00:00.000Z",
        updated_at: "2026-02-10T10:05:00.000Z",
      },
      error: null,
    });

    await expect(
      rescheduleAppointment({
        appointmentId: "appt-4",
        startTime: "2026-02-20T15:00:00.000Z",
        endTime: "2026-02-20T15:30:00.000Z",
      }),
    ).resolves.toBeDefined();
  });
});

describe("listAppointmentAuditLogsForSupport", () => {
  beforeEach(() => {
    getSupabaseAdminMock.mockReset();
  });

  it("returns logs when authorized", async () => {
    const auditRows: AuditInsertRow[] = [
      {
        appointment_id: "appt-5",
        event_type: "created",
        occurred_at: "2026-02-10T10:00:00.000Z",
        actor_type: "user",
        actor_id: "cust-1",
        metadata: null,
      },
    ];
    const supabase = makeSupabaseMock({ auditRows });

    const result = await listAppointmentAuditLogsForSupport({
      appointmentId: "appt-5",
      supabase: supabase as ReturnType<typeof getSupabaseAdminMock>,
    });

    expect(result).toHaveLength(1);
    expect(result[0].event_type).toBe("created");
  });

  it("throws when access is denied", async () => {
    const supabase = makeSupabaseMock({ selectError: { message: "permission denied" } });

    await expect(
      listAppointmentAuditLogsForSupport({
        appointmentId: "appt-6",
        supabase: supabase as ReturnType<typeof getSupabaseAdminMock>,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
