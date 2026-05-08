import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getBookingContextMock, notFoundMock } = vi.hoisted(() => ({
  getBookingContextMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/features/booking/api/getBookingContext", () => ({
  getBookingContext: getBookingContextMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import BookingPage from "./page";

describe("BookingPage", () => {
  it("renders the business name when enabled in settings", async () => {
    getBookingContextMock.mockResolvedValueOnce({
      business: {
        id: "biz-1",
        slug: "studio-north",
        name: "Studio North",
        description: "Curated studio bookings.",
        timezone: "America/New_York",
        settings: {
          publicBookingPage: {
            showBusinessName: true,
          },
        },
        contactEmail: "owner@example.com",
        contactPhone: null,
      },
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
      providers: [{ id: "staff-1", name: "Taylor Stylist" }],
    });

    const page = await BookingPage({
      params: Promise.resolve({ businessSlug: "studio-north" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Studio North");
    expect(html).toContain("Curated studio bookings.");
    expect(html).toContain("Initial Consultation");
  });

  it("uses a neutral header when the business name is hidden", async () => {
    getBookingContextMock.mockResolvedValueOnce({
      business: {
        id: "biz-1",
        slug: "studio-north",
        name: "Studio North",
        description: "Curated studio bookings.",
        timezone: "America/New_York",
        settings: {
          publicBookingPage: {
            showBusinessName: false,
          },
        },
        contactEmail: "owner@example.com",
        contactPhone: null,
      },
      services: [],
      providers: [],
    });

    const page = await BookingPage({
      params: Promise.resolve({ businessSlug: "studio-north" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Book an appointment");
    expect(html).not.toContain("Book with");
    expect(html).not.toContain("Studio North");
    expect(html).toContain("No services are currently available for online booking.");
  });

  it("returns not found when the business slug is unknown", async () => {
    getBookingContextMock.mockResolvedValueOnce(null);

    await expect(
      BookingPage({
        params: Promise.resolve({ businessSlug: "missing-slug" }),
      }),
    ).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalled();
  });
});
