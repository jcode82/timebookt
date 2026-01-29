import { describe, expect, it } from "vitest";
import { filterRemindableAppointments } from "../utils";

describe("filterRemindableAppointments", () => {
  it("excludes canceled appointments", () => {
    const input = [
      { id: "appt-1", status: "scheduled" },
      { id: "appt-2", status: "canceled" },
      { id: "appt-3", status: "scheduled" },
    ];

    const output = filterRemindableAppointments(input);

    expect(output).toEqual([
      { id: "appt-1", status: "scheduled" },
      { id: "appt-3", status: "scheduled" },
    ]);
  });
});
