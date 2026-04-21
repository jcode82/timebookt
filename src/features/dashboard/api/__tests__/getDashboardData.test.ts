import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBusinessBySlugMock, getBusinessDashboardMetricsMock, listAppointmentsForBusinessMock, listCustomersMock } = vi.hoisted(() => ({
  getBusinessBySlugMock: vi.fn(),
  getBusinessDashboardMetricsMock: vi.fn(),
  listAppointmentsForBusinessMock: vi.fn(),
  listCustomersMock: vi.fn(),
}));

vi.mock("@/domain/businesses", () => ({
  getBusinessBySlug: getBusinessBySlugMock,
  getBusinessDashboardMetrics: getBusinessDashboardMetricsMock,
}));

vi.mock("@/domain/appointments", () => ({
  listAppointmentsForBusiness: listAppointmentsForBusinessMock,
}));

vi.mock("@/domain/customers", () => ({
  listCustomers: listCustomersMock,
}));

import { getDashboardData } from "../getDashboardData";

describe("getDashboardData", () => {
  beforeEach(() => {
    getBusinessBySlugMock.mockReset();
    getBusinessDashboardMetricsMock.mockReset();
    listAppointmentsForBusinessMock.mockReset();
    listCustomersMock.mockReset();
  });

  it("returns onboarding status with dashboard data", async () => {
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
      totalAppointments: 0,
      upcomingAppointments: 0,
      activeCustomers: 0,
      recentAuditLog: [],
    });
    listAppointmentsForBusinessMock.mockResolvedValueOnce([]);
    listCustomersMock.mockResolvedValueOnce([]);

    const result = await getDashboardData("studio-north");

    expect(result?.isOnboarded).toBe(false);
    expect(result?.businessId).toBe("biz-1");
  });
});
