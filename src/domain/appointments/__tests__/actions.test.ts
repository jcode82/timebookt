import { describe, expect, it } from "vitest";
import { dedupeAndSortSlots } from "../utils";

describe("dedupeAndSortSlots", () => {
  it("dedupes slots by start/end and sorts ascending by start time", () => {
    const input = [
      { startTime: "2026-02-16T14:30:00.000Z", endTime: "2026-02-16T15:00:00.000Z" },
      { startTime: "2026-02-16T14:00:00.000Z", endTime: "2026-02-16T14:30:00.000Z" },
      { startTime: "2026-02-16T14:00:00.000Z", endTime: "2026-02-16T14:30:00.000Z" },
      { startTime: "2026-02-16T15:00:00.000Z", endTime: "2026-02-16T15:30:00.000Z" },
    ];

    const output = dedupeAndSortSlots(input);

    expect(output).toEqual([
      { startTime: "2026-02-16T14:00:00.000Z", endTime: "2026-02-16T14:30:00.000Z" },
      { startTime: "2026-02-16T14:30:00.000Z", endTime: "2026-02-16T15:00:00.000Z" },
      { startTime: "2026-02-16T15:00:00.000Z", endTime: "2026-02-16T15:30:00.000Z" },
    ]);
  });
});
