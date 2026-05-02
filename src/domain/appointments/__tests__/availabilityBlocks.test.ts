import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fromMock,
  insertMock,
  selectMock,
  maybeSingleMock,
  updateMock,
  deleteMock,
  eqMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  insertMock: vi.fn(),
  selectMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  eqMock: vi.fn(),
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
  createAvailabilityBlocks,
  deleteAvailabilityBlock,
  updateAvailabilityBlock,
} from "../actions";

describe("availability block mutations", () => {
  beforeEach(() => {
    fromMock.mockReset();
    insertMock.mockReset();
    selectMock.mockReset();
    maybeSingleMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    eqMock.mockReset();
  });

  it("inserts normalized availability blocks", async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        {
          id: "block-1",
          business_id: "biz-1",
          staff_id: null,
          region_code: "test-region",
          day_of_week: 1,
          start_time: "09:00:00",
          end_time: "17:00:00",
          capacity: 1,
          created_at: "2026-04-16T10:00:00.000Z",
        },
      ],
      error: null,
    });
    insertMock.mockReturnValue({
      select: selectMock,
    });
    fromMock.mockReturnValue({
      insert: insertMock,
    });

    const result = await createAvailabilityBlocks([
      {
        businessId: "biz-1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      },
    ]);

    expect(insertMock).toHaveBeenCalledWith([
      {
        business_id: "biz-1",
        region_code: "test-region",
        day_of_week: 1,
        start_time: "09:00:00",
        end_time: "17:00:00",
        capacity: 1,
      },
    ]);
    expect(result[0]?.id).toBe("block-1");
  });

  it("updates an existing availability block with normalized times", async () => {
    const existingBlock = {
      id: "block-1",
      business_id: "biz-1",
      staff_id: null,
      region_code: "test-region",
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "17:00:00",
      capacity: 1,
      created_at: "2026-04-16T10:00:00.000Z",
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
      data: existingBlock,
      error: null,
    });

    const updatedBlock = {
      ...existingBlock,
      day_of_week: 2,
      start_time: "10:30:00",
      end_time: "16:15:00",
      capacity: 3,
    };
    const updateMaybeSingleMock = vi.fn().mockResolvedValueOnce({
      data: updatedBlock,
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

    const result = await updateAvailabilityBlock({
      availabilityBlockId: "block-1",
      businessId: "biz-1",
      dayOfWeek: 2,
      startTime: "10:30",
      endTime: "16:15",
      capacity: 3,
    });

    expect(updateMock).toHaveBeenCalledWith({
      day_of_week: 2,
      start_time: "10:30:00",
      end_time: "16:15:00",
      capacity: 3,
    });
    expect(result).toEqual({
      id: "block-1",
      businessId: "biz-1",
      staffId: null,
      dayOfWeek: 2,
      startTime: "10:30:00",
      endTime: "16:15:00",
      capacity: 3,
    });
  });

  it("deletes an availability block scoped to the business and region", async () => {
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
      deleteAvailabilityBlock({
        availabilityBlockId: "block-1",
        businessId: "biz-1",
      }),
    ).resolves.toBeUndefined();

    expect(deleteMock).toHaveBeenCalledWith({ count: "exact" });
  });
});
