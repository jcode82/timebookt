import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, insertMock, maybeSingleMock, updateMock, deleteMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  insertMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => ({
    from: fromMock,
  }),
}));

import {
  createAvailabilityException,
  deleteAvailabilityException,
  updateAvailabilityException,
} from "../actions";

describe("availability exception mutations", () => {
  beforeEach(() => {
    fromMock.mockReset();
    insertMock.mockReset();
    maybeSingleMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  it("inserts blocked date overrides with null times", async () => {
    const createdException = {
      id: "exception-1",
      business_id: "biz-1",
      staff_id: "staff-1",
      region_code: "test-region",
      exception_date: "2026-04-24",
      is_closed: true,
      start_time: null,
      end_time: null,
      capacity: 1,
      created_at: "2026-04-20T10:00:00.000Z",
      updated_at: "2026-04-20T10:00:00.000Z",
    };
    insertMock.mockReturnValue({
      select: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: createdException,
          error: null,
        }),
      })),
    });
    fromMock.mockReturnValue({
      insert: insertMock,
    });

    const result = await createAvailabilityException({
      businessId: "biz-1",
      staffId: "staff-1",
      exceptionDate: "2026-04-24",
      isClosed: true,
    });

    expect(insertMock).toHaveBeenCalledWith({
      business_id: "biz-1",
      staff_id: "staff-1",
      region_code: "test-region",
      exception_date: "2026-04-24",
      is_closed: true,
      start_time: null,
      end_time: null,
      capacity: 1,
    });
    expect(result).toEqual({
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
    });
  });

  it("updates an open date override with normalized times", async () => {
    const existingException = {
      id: "exception-1",
      business_id: "biz-1",
      staff_id: "staff-1",
      region_code: "test-region",
      exception_date: "2026-04-24",
      is_closed: true,
      start_time: null,
      end_time: null,
      capacity: 1,
      created_at: "2026-04-20T10:00:00.000Z",
      updated_at: "2026-04-20T10:00:00.000Z",
    };
    const existingIdQuery = {
      eq: vi.fn(),
    };
    const existingBusinessQuery = {
      eq: vi.fn(),
    };
    const existingRegionQuery = {
      eq: vi.fn(),
    };
    existingIdQuery.eq.mockReturnValue(existingBusinessQuery);
    existingBusinessQuery.eq.mockReturnValue(existingRegionQuery);
    existingRegionQuery.eq.mockReturnValue({
      maybeSingle: maybeSingleMock,
    });
    maybeSingleMock.mockResolvedValueOnce({
      data: existingException,
      error: null,
    });

    const updatedException = {
      ...existingException,
      is_closed: false,
      start_time: "10:00:00",
      end_time: "14:30:00",
      capacity: 2,
      updated_at: "2026-04-20T12:00:00.000Z",
    };
    const updateMaybeSingleMock = vi.fn().mockResolvedValueOnce({
      data: updatedException,
      error: null,
    });
    const updateSelectQuery = {
      select: vi.fn(() => ({
        maybeSingle: updateMaybeSingleMock,
      })),
    };
    const updateRegionQuery = {
      eq: vi.fn(() => updateSelectQuery),
    };
    const updateBusinessQuery = {
      eq: vi.fn(() => updateRegionQuery),
    };
    const updateIdQuery = {
      eq: vi.fn(() => updateBusinessQuery),
    };
    updateMock.mockReturnValue(updateIdQuery);

    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => existingIdQuery),
      })
      .mockReturnValueOnce({
        update: updateMock,
      });

    const result = await updateAvailabilityException({
      availabilityExceptionId: "exception-1",
      businessId: "biz-1",
      isClosed: false,
      exceptionDate: "2026-04-24",
      startTime: "10:00",
      endTime: "14:30",
      capacity: 2,
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exception_date: "2026-04-24",
        is_closed: false,
        start_time: "10:00:00",
        end_time: "14:30:00",
        capacity: 2,
      }),
    );
    expect(result).toEqual({
      id: "exception-1",
      businessId: "biz-1",
      staffId: "staff-1",
      exceptionDate: "2026-04-24",
      isClosed: false,
      startTime: "10:00:00",
      endTime: "14:30:00",
      capacity: 2,
      createdAt: "2026-04-20T10:00:00.000Z",
      updatedAt: "2026-04-20T12:00:00.000Z",
    });
  });

  it("deletes an availability exception scoped to the business and region", async () => {
    const deleteRegionQuery = {
      eq: vi.fn().mockResolvedValueOnce({
        error: null,
        count: 1,
      }),
    };
    const deleteBusinessQuery = {
      eq: vi.fn(() => deleteRegionQuery),
    };
    const deleteIdQuery = {
      eq: vi.fn(() => deleteBusinessQuery),
    };

    deleteMock.mockReturnValue({
      eq: deleteIdQuery.eq,
    });
    fromMock.mockReturnValue({
      delete: deleteMock,
    });

    await expect(
      deleteAvailabilityException({
        availabilityExceptionId: "exception-1",
        businessId: "biz-1",
      }),
    ).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith({ count: "exact" });
  });
});
