import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const {
  requireBusinessOwnerAccessMock,
  updateBusinessPublicBookingPageSettingsMock,
  revalidatePathMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  requireBusinessOwnerAccessMock: vi.fn(),
  updateBusinessPublicBookingPageSettingsMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("@/domain/businesses", () => ({
  updateBusinessPublicBookingPageSettings: updateBusinessPublicBookingPageSettingsMock,
}));

vi.mock("@/lib/auth/server", () => ({
  requireBusinessOwnerAccess: requireBusinessOwnerAccessMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

import { updateDashboardBusinessSettingsAction } from "./businessSettingsActions";

describe("businessSettingsActions", () => {
  beforeEach(() => {
    requireBusinessOwnerAccessMock.mockReset();
    updateBusinessPublicBookingPageSettingsMock.mockReset();
    revalidatePathMock.mockReset();
    revalidateTagMock.mockReset();
  });

  it("updates booking page settings and revalidates the dashboard and public page", async () => {
    updateBusinessPublicBookingPageSettingsMock.mockResolvedValueOnce({
      settings: {
        bookingWindowDays: 120,
        cancellationWindowHours: 4,
        bufferMinutes: 10,
        notifications: {
          email: true,
          sms: false,
        },
        publicBookingPage: {
          showBusinessName: false,
          serviceVisibility: "selected",
          visibleServiceIds: ["svc-2"],
        },
      },
    });

    const result = await updateDashboardBusinessSettingsAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      showBusinessName: false,
      serviceVisibility: "selected",
      visibleServiceIds: ["svc-2"],
    });

    expect(updateBusinessPublicBookingPageSettingsMock).toHaveBeenCalledWith({
      businessId: "biz-1",
      showBusinessName: false,
      serviceVisibility: "selected",
      visibleServiceIds: ["svc-2"],
    });
    expect(requireBusinessOwnerAccessMock).toHaveBeenCalledWith("biz-1");
    expect(revalidateTagMock).toHaveBeenCalledWith("dashboard-data");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/studio-north");
    expect(revalidatePathMock).toHaveBeenCalledWith("/studio-north/book");
    expect(result).toEqual({
      ok: true,
      settings: expect.objectContaining({
        publicBookingPage: expect.objectContaining({
          showBusinessName: false,
          serviceVisibility: "selected",
        }),
      }),
    });
  });

  it("rejects selected visibility when no services are chosen", async () => {
    const result = await updateDashboardBusinessSettingsAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      showBusinessName: true,
      serviceVisibility: "selected",
      visibleServiceIds: [],
    });

    expect(result).toEqual({
      ok: false,
      message: "Select at least one service for the booking page.",
    });
    expect(updateBusinessPublicBookingPageSettingsMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("blocks unauthorized updates before writing settings", async () => {
    requireBusinessOwnerAccessMock.mockRejectedValueOnce(new DomainError("Unauthorized"));

    const result = await updateDashboardBusinessSettingsAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      showBusinessName: true,
      serviceVisibility: "all",
      visibleServiceIds: [],
    });

    expect(result).toEqual({
      ok: false,
      message: "Unauthorized",
    });
    expect(updateBusinessPublicBookingPageSettingsMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("returns domain errors without throwing", async () => {
    updateBusinessPublicBookingPageSettingsMock.mockRejectedValueOnce(
      new DomainError("Unable to update business settings"),
    );

    const result = await updateDashboardBusinessSettingsAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      showBusinessName: true,
      serviceVisibility: "all",
      visibleServiceIds: [],
    });

    expect(result).toEqual({
      ok: false,
      message: "Unable to update business settings",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });
});
