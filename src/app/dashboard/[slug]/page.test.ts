import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const {
  getDashboardDataMock,
  getOwnedBusinessBySlugMock,
  UnauthorizedErrorMock,
  notFoundMock,
  redirectMock,
} = vi.hoisted(() => ({
  getDashboardDataMock: vi.fn(),
  getOwnedBusinessBySlugMock: vi.fn(),
  UnauthorizedErrorMock: class UnauthorizedError extends Error {},
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

vi.mock("@/features/dashboard/api/getDashboardData", () => ({
  getDashboardData: getDashboardDataMock,
}));

vi.mock("@/lib/auth/server", () => ({
  getOwnedBusinessBySlug: getOwnedBusinessBySlugMock,
  UNAUTHORIZED_REDIRECT_PATH: "/",
  UnauthorizedError: UnauthorizedErrorMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    getDashboardDataMock.mockReset();
    getOwnedBusinessBySlugMock.mockReset();
    notFoundMock.mockClear();
    redirectMock.mockClear();
  });

  it("renders the dashboard foundation sections", async () => {
    getOwnedBusinessBySlugMock.mockResolvedValueOnce({
      id: "biz-1",
      slug: "studio-north",
    });
    getDashboardDataMock.mockResolvedValueOnce({
      businessId: "biz-1",
      businessName: "Studio North",
      slug: "studio-north",
      timezone: "America/New_York",
      isOnboarded: true,
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
      metrics: {
        totalAppointments: 24,
        bookingsToday: 3,
        bookingsThisWeek: 11,
        upcomingAppointments: 8,
        activeCustomers: 19,
        recentAuditLog: [],
      },
      appointments: [
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
      ],
      customers: [
        {
          id: "cust-1",
          businessId: "biz-1",
          fullName: "Jamie Fox",
          email: "jamie@example.com",
          phone: "555-0110",
          locale: null,
          createdAt: "2026-04-20T10:00:00.000Z",
          updatedAt: "2026-04-20T10:00:00.000Z",
          bookingCount: 2,
        },
      ],
      services: [
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
      ],
      availability: [
        {
          id: "avail-1",
          businessId: "biz-1",
          staffId: null,
          dayOfWeek: 1,
          startTime: "09:00:00",
          endTime: "17:00:00",
          capacity: 1,
        },
      ],
      availabilityExceptions: [
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
      ],
      staffMembers: [
        {
          id: "staff-1",
          businessId: "biz-1",
          fullName: "Taylor Stylist",
          email: "taylor@example.com",
          role: "staff",
        },
      ],
    });

    const page = await DashboardPage({
      params: Promise.resolve({ slug: "studio-north" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Operations at a glance");
    expect(html).toContain('href="#services"');
    expect(html).toContain('href="#booking-page-settings"');
    expect(html).toContain('href="#availability"');
    expect(html).toContain('href="#availability-exceptions"');
    expect(html).toContain('href="#appointments"');
    expect(html).toContain('href="#customers"');
    expect(html).toContain("Appointment management");
    expect(html).toContain("Customer management");
    expect(html).toContain("Jamie Fox");
    expect(html).toContain("View appointments");
    expect(html).toContain("Create service");
    expect(html).toContain("Public booking page settings");
    expect(html).toContain("/studio-north/book");
    expect(html).toContain("Weekly schedule");
    expect(html).toContain("Add availability block");
    expect(html).toContain("Availability exceptions");
    expect(html).toContain("Add date override");
  });

  it("redirects businesses that have not completed onboarding", async () => {
    getOwnedBusinessBySlugMock.mockResolvedValueOnce({
      id: "biz-1",
      slug: "studio-north",
    });
    getDashboardDataMock.mockResolvedValueOnce({
      businessId: "biz-1",
      businessName: "Studio North",
      slug: "studio-north",
      timezone: "America/New_York",
      isOnboarded: false,
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
      metrics: {
        totalAppointments: 0,
        bookingsToday: 0,
        bookingsThisWeek: 0,
        upcomingAppointments: 0,
        activeCustomers: 0,
        recentAuditLog: [],
      },
      appointments: [],
      customers: [],
      services: [],
      availability: [],
      availabilityExceptions: [],
      staffMembers: [],
    });

    await expect(
      DashboardPage({
        params: Promise.resolve({ slug: "studio-north" }),
      }),
    ).rejects.toThrow("redirect");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("returns not found when the slug is unknown", async () => {
    getOwnedBusinessBySlugMock.mockResolvedValueOnce(null);

    await expect(
      DashboardPage({
        params: Promise.resolve({ slug: "missing-slug" }),
      }),
    ).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalled();
    expect(getDashboardDataMock).not.toHaveBeenCalled();
  });

  it("redirects when the signed-in user does not own the business", async () => {
    getOwnedBusinessBySlugMock.mockRejectedValueOnce(new UnauthorizedErrorMock("Unauthorized"));

    await expect(
      DashboardPage({
        params: Promise.resolve({ slug: "studio-north" }),
      }),
    ).rejects.toThrow("redirect");
    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(getDashboardDataMock).not.toHaveBeenCalled();
  });
});
