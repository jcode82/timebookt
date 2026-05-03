import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getDashboardDataMock, notFoundMock, redirectMock } = vi.hoisted(() => ({
  getDashboardDataMock: vi.fn(),
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

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders the dashboard foundation sections", async () => {
    getDashboardDataMock.mockResolvedValueOnce({
      businessId: "biz-1",
      businessName: "Studio North",
      slug: "studio-north",
      timezone: "America/New_York",
      isOnboarded: true,
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
    });

    const page = await DashboardPage({
      params: Promise.resolve({ slug: "studio-north" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Operations at a glance");
    expect(html).toContain('href="#services"');
    expect(html).toContain('href="#availability"');
    expect(html).toContain('href="#appointments"');
    expect(html).toContain("Appointment management");
    expect(html).toContain("Create service");
    expect(html).toContain("Weekly schedule");
    expect(html).toContain("Add availability block");
  });

  it("redirects businesses that have not completed onboarding", async () => {
    getDashboardDataMock.mockResolvedValueOnce({
      businessId: "biz-1",
      businessName: "Studio North",
      slug: "studio-north",
      timezone: "America/New_York",
      isOnboarded: false,
      metrics: {
        totalAppointments: 0,
        bookingsToday: 0,
        bookingsThisWeek: 0,
        upcomingAppointments: 0,
        activeCustomers: 0,
        recentAuditLog: [],
      },
      appointments: [],
      services: [],
      availability: [],
    });

    await expect(
      DashboardPage({
        params: Promise.resolve({ slug: "studio-north" }),
      }),
    ).rejects.toThrow("redirect");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("returns not found when the slug is unknown", async () => {
    getDashboardDataMock.mockResolvedValueOnce(null);

    await expect(
      DashboardPage({
        params: Promise.resolve({ slug: "missing-slug" }),
      }),
    ).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalled();
  });
});
