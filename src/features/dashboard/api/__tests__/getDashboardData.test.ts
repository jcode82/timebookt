import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  unstableCacheMock,
  getBusinessBySlugMock,
  getBusinessDashboardMetricsMock,
  listAppointmentsForBusinessMock,
  listServicesForBusinessMock,
  getAvailabilityMock,
} = vi.hoisted(() => ({
  unstableCacheMock: vi.fn((callback: (...args: unknown[]) => unknown) => callback),
  getBusinessBySlugMock: vi.fn(),
  getBusinessDashboardMetricsMock: vi.fn(),
  listAppointmentsForBusinessMock: vi.fn(),
  listServicesForBusinessMock: vi.fn(),
  getAvailabilityMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/domain/businesses", () => ({
  getBusinessBySlug: getBusinessBySlugMock,
  getBusinessDashboardMetrics: getBusinessDashboardMetricsMock,
}));

vi.mock("@/domain/appointments", () => ({
  getAvailability: getAvailabilityMock,
  listAppointmentsForBusiness: listAppointmentsForBusinessMock,
}));

vi.mock("@/domain/services", () => ({
  listServicesForBusiness: listServicesForBusinessMock,
}));

import { getDashboardData } from "../getDashboardData";

describe("getDashboardData", () => {
  beforeEach(() => {
    getBusinessBySlugMock.mockReset();
    getBusinessDashboardMetricsMock.mockReset();
    listAppointmentsForBusinessMock.mockReset();
    listServicesForBusinessMock.mockReset();
    getAvailabilityMock.mockReset();
  });

  it("returns dashboard data from the business slug", async () => {
    getBusinessBySlugMock.mockResolvedValueOnce({
      id: "biz-1",
      slug: "studio-north",
      name: "Studio North",
      description: null,
      regionCode: "test-region",
      timezone: "America/New_York",
      contactEmail: "owner@example.com",
      contactPhone: null,
      settings: {
        bookingWindowDays: 120,
        cancellationWindowHours: 4,
        bufferMinutes: 10,
        notifications: {
          email: true,
          sms: false,
        },
      },
      isOnboarded: false,
      createdAt: "2026-04-17T10:00:00.000Z",
      updatedAt: "2026-04-17T10:00:00.000Z",
    });
    getBusinessDashboardMetricsMock.mockResolvedValueOnce({
      totalAppointments: 24,
      bookingsToday: 3,
      bookingsThisWeek: 11,
      upcomingAppointments: 8,
      activeCustomers: 19,
      recentAuditLog: [],
    });
    listAppointmentsForBusinessMock.mockResolvedValueOnce([
      {
        id: "apt-1",
        businessId: "biz-1",
        customerId: "cust-1",
        serviceId: "svc-1",
        staffId: null,
        startTime: "2026-04-23T13:00:00.000Z",
        endTime: "2026-04-23T14:00:00.000Z",
        status: "scheduled",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-20T10:00:00.000Z",
        updatedAt: "2026-04-20T10:00:00.000Z",
      },
    ]);
    listServicesForBusinessMock.mockResolvedValueOnce([
      {
        id: "svc-1",
        businessId: "biz-1",
        name: "Initial Consultation",
        description: null,
        durationMinutes: 60,
        priceCents: 12000,
        currency: "USD",
        isActive: true,
      },
    ]);
    getAvailabilityMock.mockResolvedValueOnce([
      {
        id: "avail-1",
        businessId: "biz-1",
        staffId: null,
        dayOfWeek: 1,
        startTime: "09:00:00",
        endTime: "17:00:00",
        capacity: 1,
      },
    ]);

    const result = await getDashboardData("studio-north");

    expect(result?.isOnboarded).toBe(false);
    expect(result?.businessId).toBe("biz-1");
    expect(result?.timezone).toBe("America/New_York");
    expect(result?.services).toHaveLength(1);
    expect(result?.availability).toHaveLength(1);
    expect(listAppointmentsForBusinessMock).toHaveBeenCalledWith("biz-1", {
      limit: 10,
      onlyUpcoming: true,
      statuses: ["scheduled"],
    });
    expect(getAvailabilityMock).toHaveBeenCalledWith({ businessId: "biz-1" });
  });

  it("returns null when the business does not exist", async () => {
    getBusinessBySlugMock.mockResolvedValueOnce(null);

    const result = await getDashboardData("missing-slug");

    expect(result).toBeNull();
    expect(getBusinessDashboardMetricsMock).not.toHaveBeenCalled();
    expect(listAppointmentsForBusinessMock).not.toHaveBeenCalled();
  });
});
