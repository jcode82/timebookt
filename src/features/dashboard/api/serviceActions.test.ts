import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const {
  createServiceMock,
  updateServiceMock,
  revalidatePathMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  createServiceMock: vi.fn(),
  updateServiceMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("@/domain/services/actions", () => ({
  createService: createServiceMock,
  updateService: updateServiceMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

import {
  createDashboardServiceAction,
  setDashboardServiceActiveStateAction,
  updateDashboardServiceAction,
} from "./serviceActions";

describe("serviceActions", () => {
  beforeEach(() => {
    createServiceMock.mockReset();
    updateServiceMock.mockReset();
    revalidatePathMock.mockReset();
    revalidateTagMock.mockReset();
  });

  it("creates services with validated input and revalidates the dashboard", async () => {
    createServiceMock.mockResolvedValueOnce({
      id: "svc-1",
      businessId: "biz-1",
      name: "Deep Clean",
      description: null,
      durationMinutes: 90,
      priceCents: 12500,
      currency: "USD",
      isActive: true,
    });

    const service = await createDashboardServiceAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      name: "Deep Clean",
      durationMinutes: "90",
      price: "125.00",
    });

    expect(createServiceMock).toHaveBeenCalledWith({
      businessId: "biz-1",
      name: "Deep Clean",
      durationMinutes: 90,
      priceCents: 12500,
      currency: "USD",
    });
    expect(revalidateTagMock).toHaveBeenCalledWith("dashboard-data");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/studio-north");
    expect(service).toEqual({
      ok: true,
      service: expect.objectContaining({ id: "svc-1" }),
    });
  });

  it("updates services with validated input and revalidates the dashboard", async () => {
    updateServiceMock.mockResolvedValueOnce({
      id: "svc-1",
      businessId: "biz-1",
      name: "Deep Clean Plus",
      description: null,
      durationMinutes: 120,
      priceCents: 17500,
      currency: "USD",
      isActive: true,
    });

    const service = await updateDashboardServiceAction({
      serviceId: "svc-1",
      businessId: "biz-1",
      businessSlug: "studio-north",
      name: "Deep Clean Plus",
      durationMinutes: "120",
      price: "175.00",
    });

    expect(updateServiceMock).toHaveBeenCalledWith({
      serviceId: "svc-1",
      businessId: "biz-1",
      name: "Deep Clean Plus",
      durationMinutes: 120,
      priceCents: 17500,
      currency: "USD",
    });
    expect(revalidateTagMock).toHaveBeenCalledWith("dashboard-data");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/studio-north");
    expect(service).toEqual({
      ok: true,
      service: expect.objectContaining({ name: "Deep Clean Plus" }),
    });
  });

  it("toggles service active state through updateService", async () => {
    updateServiceMock.mockResolvedValueOnce({
      id: "svc-1",
      businessId: "biz-1",
      name: "Deep Clean",
      description: null,
      durationMinutes: 90,
      priceCents: 12500,
      currency: "USD",
      isActive: false,
    });

    const service = await setDashboardServiceActiveStateAction({
      serviceId: "svc-1",
      businessId: "biz-1",
      businessSlug: "studio-north",
      isActive: false,
    });

    expect(updateServiceMock).toHaveBeenCalledWith({
      serviceId: "svc-1",
      businessId: "biz-1",
      isActive: false,
    });
    expect(revalidateTagMock).toHaveBeenCalledWith("dashboard-data");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/studio-north");
    expect(service).toEqual({
      ok: true,
      service: expect.objectContaining({ isActive: false }),
    });
  });

  it("rejects invalid create payloads before hitting the domain", async () => {
    const result = await createDashboardServiceAction({
      businessId: "biz-1",
      businessSlug: "studio-north",
      name: "",
      durationMinutes: "0",
      price: "abc",
    });

    expect(result).toEqual({
      ok: false,
      message: expect.any(String),
    });
    expect(createServiceMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns action errors instead of throwing when updates fail", async () => {
    updateServiceMock.mockRejectedValueOnce(
      new DomainError("Service updates are unavailable until the latest Supabase service RPC migration is applied"),
    );

    const result = await setDashboardServiceActiveStateAction({
      serviceId: "svc-1",
      businessId: "biz-1",
      businessSlug: "studio-north",
      isActive: false,
    });

    expect(result).toEqual({
      ok: false,
      message: "Service updates are unavailable until the latest Supabase service RPC migration is applied",
    });
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
