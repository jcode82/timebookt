import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const {
  completeBusinessOnboardingMock,
  createAvailabilityBlocksMock,
  createBusinessForOwnerMock,
  createServiceMock,
  requireBusinessOwnerAccessMock,
  requireSessionUserMock,
} = vi.hoisted(() => ({
  completeBusinessOnboardingMock: vi.fn(),
  createAvailabilityBlocksMock: vi.fn(),
  createBusinessForOwnerMock: vi.fn(),
  createServiceMock: vi.fn(),
  requireBusinessOwnerAccessMock: vi.fn(),
  requireSessionUserMock: vi.fn(),
}));

vi.mock("@/domain/appointments", () => ({
  createAvailabilityBlocks: createAvailabilityBlocksMock,
}));

vi.mock("@/domain/businesses", () => ({
  completeBusinessOnboarding: completeBusinessOnboardingMock,
  createBusinessForOwner: createBusinessForOwnerMock,
}));

vi.mock("@/domain/services/actions", () => ({
  createService: createServiceMock,
}));

vi.mock("@/lib/auth/server", () => ({
  requireBusinessOwnerAccess: requireBusinessOwnerAccessMock,
  requireSessionUser: requireSessionUserMock,
}));

import {
  completeOnboardingAction,
  createOnboardingAvailabilityAction,
  createOnboardingBusinessAction,
  createOnboardingServiceAction,
} from "./actions";

describe("onboarding actions", () => {
  beforeEach(() => {
    completeBusinessOnboardingMock.mockReset();
    createAvailabilityBlocksMock.mockReset();
    createBusinessForOwnerMock.mockReset();
    createServiceMock.mockReset();
    requireBusinessOwnerAccessMock.mockReset();
    requireSessionUserMock.mockReset();
  });

  it("creates businesses for the authenticated owner", async () => {
    requireSessionUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "owner@example.com",
      fullName: "Owner Example",
    });
    createBusinessForOwnerMock.mockResolvedValueOnce({
      id: "biz-1",
      slug: "studio-north",
      name: "Studio North",
    });

    const result = await createOnboardingBusinessAction({
      name: "Studio North",
      slug: "studio-north",
      regionCode: "global",
      timezone: "America/New_York",
      contactEmail: "owner@example.com",
      contactPhone: "",
      description: "",
    });

    expect(createBusinessForOwnerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Studio North",
        slug: "studio-north",
        contactEmail: "owner@example.com",
      }),
      {
        userId: "user-1",
        email: "owner@example.com",
        fullName: "Owner Example",
      },
    );
    expect(result).toEqual({
      id: "biz-1",
      slug: "studio-north",
      name: "Studio North",
    });
  });

  it("blocks service creation when the business is not owned by the user", async () => {
    requireBusinessOwnerAccessMock.mockRejectedValueOnce(new DomainError("Unauthorized"));

    await expect(
      createOnboardingServiceAction({
        businessId: "biz-1",
        name: "Deep Clean",
        durationMinutes: 90,
        priceCents: 12500,
        currency: "USD",
      }),
    ).rejects.toThrow("Unauthorized");
    expect(createServiceMock).not.toHaveBeenCalled();
  });

  it("checks owner access before creating onboarding availability", async () => {
    createAvailabilityBlocksMock.mockResolvedValueOnce([]);

    await createOnboardingAvailabilityAction({
      blocks: [
        {
          businessId: "biz-1",
          dayOfWeek: 1,
          startTime: "09:00:00",
          endTime: "17:00:00",
          capacity: 1,
        },
      ],
    });

    expect(requireBusinessOwnerAccessMock).toHaveBeenCalledWith("biz-1");
    expect(createAvailabilityBlocksMock).toHaveBeenCalled();
  });

  it("checks owner access before completing onboarding", async () => {
    await completeOnboardingAction({
      businessId: "biz-1",
      slug: "studio-north",
    });

    expect(requireBusinessOwnerAccessMock).toHaveBeenCalledWith("biz-1");
    expect(completeBusinessOnboardingMock).toHaveBeenCalledWith("biz-1");
  });
});
