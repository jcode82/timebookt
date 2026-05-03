import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listAppointmentAdminRecordsForBusinessMock,
  cancelAppointmentMock,
  createCanonicalAppointmentMock,
} = vi.hoisted(() => ({
  listAppointmentAdminRecordsForBusinessMock: vi.fn(),
  cancelAppointmentMock: vi.fn(),
  createCanonicalAppointmentMock: vi.fn(),
}));

vi.mock("@/domain/appointments", () => ({
  listAppointmentAdminRecordsForBusiness: listAppointmentAdminRecordsForBusinessMock,
  cancelAppointment: cancelAppointmentMock,
  createCanonicalAppointment: createCanonicalAppointmentMock,
}));

import { GET, PATCH } from "./route";

describe("/api/appointments", () => {
  beforeEach(() => {
    listAppointmentAdminRecordsForBusinessMock.mockReset();
    cancelAppointmentMock.mockReset();
    createCanonicalAppointmentMock.mockReset();
  });

  it("lists appointments with optional date and status filters", async () => {
    listAppointmentAdminRecordsForBusinessMock.mockResolvedValueOnce([
      {
        id: "appt-1",
        businessId: "biz-1",
        customerId: "cust-1",
        serviceId: "svc-1",
        staffId: "staff-1",
        startTime: "2026-05-02T13:00:00.000Z",
        endTime: "2026-05-02T14:00:00.000Z",
        status: "scheduled",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-05-01T10:00:00.000Z",
        updatedAt: "2026-05-01T10:00:00.000Z",
        serviceName: "Deep Clean",
        customerName: "Jamie Fox",
        customerEmail: "jamie@example.com",
        customerPhone: "555-0110",
        providerName: "Taylor Reed",
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/appointments?businessId=biz-1&date=2026-05-02&status=scheduled"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.appointments).toHaveLength(1);
    expect(listAppointmentAdminRecordsForBusinessMock).toHaveBeenCalledWith("biz-1", {
      date: "2026-05-02",
      statuses: ["scheduled"],
    });
  });

  it("rejects invalid date filters", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointments?businessId=biz-1&date=05-02-2026"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("date must be YYYY-MM-DD");
    expect(listAppointmentAdminRecordsForBusinessMock).not.toHaveBeenCalled();
  });

  it("cancels appointments through PATCH", async () => {
    cancelAppointmentMock.mockResolvedValueOnce({
      id: "appt-1",
      businessId: "biz-1",
      customerId: "cust-1",
      serviceId: "svc-1",
      staffId: "staff-1",
      startTime: "2026-05-02T13:00:00.000Z",
      endTime: "2026-05-02T14:00:00.000Z",
      status: "canceled",
      notes: null,
      cancellationReason: null,
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-02T13:05:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost/api/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: "appt-1",
          status: "canceled",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("canceled");
    expect(cancelAppointmentMock).toHaveBeenCalledWith({
      appointmentId: "appt-1",
      cancellationReason: undefined,
    });
  });

  it("rejects unsupported status updates", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: "appt-1",
          status: "completed",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Only canceled status updates are supported");
    expect(cancelAppointmentMock).not.toHaveBeenCalled();
  });
});
