import { describe, expect, it } from "vitest";
import {
  createDashboardAvailabilitySchema,
  updateDashboardAvailabilitySchema,
} from "./availabilityManagementSchema";

describe("availabilityManagementSchema", () => {
  it("normalizes valid create payloads for recurring weekly availability", () => {
    const result = createDashboardAvailabilitySchema.parse({
      businessId: "biz-1",
      businessSlug: "studio-north",
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "17:00",
      capacity: "2",
    });

    expect(result).toEqual({
      businessId: "biz-1",
      businessSlug: "studio-north",
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "17:00:00",
      capacity: 2,
    });
  });

  it("rejects inverted time ranges", () => {
    const result = createDashboardAvailabilitySchema.safeParse({
      businessId: "biz-1",
      businessSlug: "studio-north",
      dayOfWeek: "1",
      startTime: "17:00",
      endTime: "09:00",
      capacity: "2",
    });

    expect(result.success).toBe(false);
  });

  it("requires a block id when updating an existing availability block", () => {
    const result = updateDashboardAvailabilitySchema.safeParse({
      businessId: "biz-1",
      businessSlug: "studio-north",
      dayOfWeek: "2",
      startTime: "10:00",
      endTime: "16:00",
      capacity: "3",
    });

    expect(result.success).toBe(false);
  });
});
