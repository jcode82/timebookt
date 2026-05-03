import { describe, expect, it } from "vitest";
import {
  createDashboardAvailabilitySchema,
  createDashboardAvailabilityExceptionSchema,
  updateDashboardAvailabilitySchema,
  updateDashboardAvailabilityExceptionSchema,
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

  it("normalizes blocked date override payloads", () => {
    const result = createDashboardAvailabilityExceptionSchema.parse({
      businessId: "biz-1",
      businessSlug: "studio-north",
      staffId: "staff-1",
      exceptionDate: "2026-04-24",
      overrideType: "closed",
      startTime: "",
      endTime: "",
      capacity: "1",
    });

    expect(result).toEqual({
      businessId: "biz-1",
      businessSlug: "studio-north",
      staffId: "staff-1",
      exceptionDate: "2026-04-24",
      isClosed: true,
      startTime: null,
      endTime: null,
      capacity: 1,
    });
  });

  it("normalizes open date override payloads", () => {
    const result = updateDashboardAvailabilityExceptionSchema.parse({
      availabilityExceptionId: "exception-1",
      businessId: "biz-1",
      businessSlug: "studio-north",
      staffId: "staff-1",
      exceptionDate: "2026-04-24",
      overrideType: "open",
      startTime: "10:00",
      endTime: "14:30",
      capacity: "2",
    });

    expect(result).toEqual({
      availabilityExceptionId: "exception-1",
      businessId: "biz-1",
      businessSlug: "studio-north",
      staffId: "staff-1",
      exceptionDate: "2026-04-24",
      isClosed: false,
      startTime: "10:00:00",
      endTime: "14:30:00",
      capacity: 2,
    });
  });

  it("requires times for open date overrides", () => {
    const result = createDashboardAvailabilityExceptionSchema.safeParse({
      businessId: "biz-1",
      businessSlug: "studio-north",
      staffId: "staff-1",
      exceptionDate: "2026-04-24",
      overrideType: "open",
      startTime: "",
      endTime: "",
      capacity: "2",
    });

    expect(result.success).toBe(false);
  });
});
