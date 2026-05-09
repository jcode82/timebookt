import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const {
  createAvailabilityBlocksMock,
  requireBusinessOwnerAccessMock,
  revalidatePathMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  createAvailabilityBlocksMock: vi.fn(),
  requireBusinessOwnerAccessMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("@/domain/appointments/actions", () => ({
  createAvailabilityBlocks: createAvailabilityBlocksMock,
  createAvailabilityException: vi.fn(),
  deleteAvailabilityException: vi.fn(),
  deleteAvailabilityBlock: vi.fn(),
  updateAvailabilityException: vi.fn(),
  updateAvailabilityBlock: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requireBusinessOwnerAccess: requireBusinessOwnerAccessMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

import { createDashboardAvailabilityAction } from "./availabilityActions";

describe("availabilityActions", () => {
  beforeEach(() => {
    createAvailabilityBlocksMock.mockReset();
    requireBusinessOwnerAccessMock.mockReset();
    revalidatePathMock.mockReset();
    revalidateTagMock.mockReset();
  });

  it("creates availability for authorized owners and revalidates the dashboard", async () => {
    createAvailabilityBlocksMock.mockResolvedValueOnce([
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

    const result = await createDashboardAvailabilityAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "17:00",
      capacity: "1",
    });

    expect(requireBusinessOwnerAccessMock).toHaveBeenCalledWith("biz-1");
    expect(createAvailabilityBlocksMock).toHaveBeenCalledWith([
      {
        businessId: "biz-1",
        dayOfWeek: 1,
        startTime: "09:00:00",
        endTime: "17:00:00",
        capacity: 1,
      },
    ]);
    expect(revalidateTagMock).toHaveBeenCalledWith("dashboard-data");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/studio-north");
    expect(result).toEqual({
      ok: true,
      availabilityBlock: expect.objectContaining({ id: "avail-1" }),
    });
  });

  it("blocks unauthorized availability changes", async () => {
    requireBusinessOwnerAccessMock.mockRejectedValueOnce(new DomainError("Unauthorized"));

    const result = await createDashboardAvailabilityAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "17:00",
      capacity: "1",
    });

    expect(result).toEqual({
      ok: false,
      message: "Unauthorized",
    });
    expect(createAvailabilityBlocksMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
