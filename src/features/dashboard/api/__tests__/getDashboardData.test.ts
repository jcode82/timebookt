import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  unstableCacheMock,
  getBusinessBySlugMock,
  getBusinessDashboardMetricsMock,
  listAppointmentsForBusinessMock,
  listBookedCustomersForBusinessMock,
  listServicesForBusinessMock,
  getAvailabilityMock,
  getAvailabilityExceptionsMock,
  listStaffForBusinessMock,
} = vi.hoisted(() => ({
  unstableCacheMock: vi.fn((callback: (...args: unknown[]) => unknown) => callback),
  getBusinessBySlugMock: vi.fn(),
  getBusinessDashboardMetricsMock: vi.fn(),
  listAppointmentsForBusinessMock: vi.fn(),
  listBookedCustomersForBusinessMock: vi.fn(),
  listServicesForBusinessMock: vi.fn(),
  getAvailabilityMock: vi.fn(),
  getAvailabilityExceptionsMock: vi.fn(),
  listStaffForBusinessMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/domain/businesses", () => ({
  getBusinessBySlug: getBusinessBySlugMock,
  getBusinessDashboardMetrics: getBusinessDashboardMetricsMock,
  listStaffForBusiness: listStaffForBusinessMock,
}));

vi.mock("@/domain/appointments", () => ({
  getAvailability: getAvailabilityMock,
  getAvailabilityExceptions: getAvailabilityExceptionsMock,
  listAppointmentsForBusiness: listAppointmentsForBusinessMock,
}));

vi.mock("@/domain/customers", () => ({
  listBookedCustomersForBusiness: listBookedCustomersForBusinessMock,
}));

vi.mock("@/domain/services/actions", () => ({
  listServicesForBusiness: listServicesForBusinessMock,
}));

import { getDashboardData } from "../getDashboardData";

describe("getDashboardData", () => {
  beforeEach(() => {
    getBusinessBySlugMock.mockReset();
    getBusinessDashboardMetricsMock.mockReset();
    listAppointmentsForBusinessMock.mockReset();
    listBookedCustomersForBusinessMock.mockReset();
    listServicesForBusinessMock.mockReset();
    getAvailabilityMock.mockReset();
    getAvailabilityExceptionsMock.mockReset();
    listStaffForBusinessMock.mockReset();
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
        publicBookingPage: {
          showBusinessName: true,
          serviceVisibility: "all",
          visibleServiceIds: [],
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
    listBookedCustomersForBusinessMock.mockResolvedValueOnce([
      {
        id: "cust-1",
        businessId: "biz-1",
        fullName: "Jamie Fox",
        email: "jamie@example.com",
        phone: "555-0110",
        locale: null,
        createdAt: "2026-04-20T10:00:00.000Z",
        updatedAt: "2026-04-20T10:00:00.000Z",
        bookingCount: 3,
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
    getAvailabilityExceptionsMock.mockResolvedValueOnce([
      {
        id: "exception-1",
        businessId: "biz-1",
        staffId: "staff-1",
        exceptionDate: "2026-04-24",
        isClosed: true,
        startTime: null,
        endTime: null,
        capacity: 1,
        createdAt: "2026-04-20T10:00:00.000Z",
        updatedAt: "2026-04-20T10:00:00.000Z",
      },
    ]);
    listStaffForBusinessMock.mockResolvedValueOnce([
      {
        id: "staff-1",
        businessId: "biz-1",
        fullName: "Taylor Stylist",
        email: "taylor@example.com",
        role: "staff",
      },
    ]);

    const result = await getDashboardData("studio-north");

    expect(result?.isOnboarded).toBe(false);
    expect(result?.businessId).toBe("biz-1");
    expect(result?.timezone).toBe("America/New_York");
    expect(result?.settings.publicBookingPage).toEqual({
      showBusinessName: true,
      serviceVisibility: "all",
      visibleServiceIds: [],
    });
    expect(result?.customers).toHaveLength(1);
    expect(result?.services).toHaveLength(1);
    expect(result?.availability).toHaveLength(1);
    expect(result?.availabilityExceptions).toHaveLength(1);
    expect(result?.staffMembers).toHaveLength(1);
    expect(listAppointmentsForBusinessMock).toHaveBeenCalledWith("biz-1", {
      limit: 10,
      onlyUpcoming: true,
      statuses: ["scheduled"],
    });
    expect(listBookedCustomersForBusinessMock).toHaveBeenCalledWith({
      businessId: "biz-1",
      limit: 25,
    });
    expect(listServicesForBusinessMock).toHaveBeenCalledWith("biz-1", {
      includeInactive: true,
    });
    expect(getAvailabilityMock).toHaveBeenCalledWith({ businessId: "biz-1" });
    expect(getAvailabilityExceptionsMock).toHaveBeenCalledWith({ businessId: "biz-1" });
    expect(listStaffForBusinessMock).toHaveBeenCalledWith("biz-1");
  });

  it("returns null when the business does not exist", async () => {
    getBusinessBySlugMock.mockResolvedValueOnce(null);

    const result = await getDashboardData("missing-slug");

    expect(result).toBeNull();
    expect(getBusinessDashboardMetricsMock).not.toHaveBeenCalled();
    expect(listAppointmentsForBusinessMock).not.toHaveBeenCalled();
    expect(listBookedCustomersForBusinessMock).not.toHaveBeenCalled();
  });
});
