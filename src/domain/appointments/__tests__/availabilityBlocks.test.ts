import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, insertMock, selectMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  insertMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => ({
    from: fromMock,
  }),
}));

import { createAvailabilityBlocks } from "../actions";

describe("createAvailabilityBlocks", () => {
  beforeEach(() => {
    fromMock.mockReset();
    insertMock.mockReset();
    selectMock.mockReset();
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
        startTime: "09:00:00",
        endTime: "17:00:00",
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
});
