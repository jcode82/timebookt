import { beforeEach, describe, expect, it, vi } from "vitest";

type AvailabilityBlockTestRow = {
  id: string;
  business_id: string;
  staff_id: string;
  region_code: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  created_at: string;
};

type AppointmentTestRow = {
  id: string;
  business_id: string;
  staff_id: string;
  region_code: string;
  status: string;
  start_time: string;
  end_time: string;
};

const baseAvailabilityRow: AvailabilityBlockTestRow = {
  id: "block-1",
  business_id: "biz-1",
  staff_id: "staff-1",
  region_code: "test-region",
  day_of_week: 1,
  start_time: "14:00:00",
  end_time: "15:00:00",
  capacity: 1,
  created_at: "2026-02-01T00:00:00.000Z",
};

const baseAppointmentRow: AppointmentTestRow = {
  id: "appt-1",
  business_id: "biz-1",
  staff_id: "staff-1",
  region_code: "test-region",
  status: "scheduled",
  start_time: "2026-02-16T14:00:00.000Z",
  end_time: "2026-02-16T14:30:00.000Z",
};

type AvailabilityExceptionTestRow = {
  id: string;
  business_id: string;
  staff_id: string;
  region_code: string;
  exception_date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  capacity: number;
  created_at: string;
  updated_at: string;
};

const baseExceptionRow: AvailabilityExceptionTestRow = {
  id: "exception-1",
  business_id: "biz-1",
  staff_id: "staff-1",
  region_code: "test-region",
  exception_date: "2026-02-16",
  is_closed: false,
  start_time: "15:00:00",
  end_time: "16:00:00",
  capacity: 1,
  created_at: "2026-02-01T00:00:00.000Z",
  updated_at: "2026-02-01T00:00:00.000Z",
};

let availabilityRows: AvailabilityBlockTestRow[] = [baseAvailabilityRow];
let exceptionRows: AvailabilityExceptionTestRow[] = [];
let appointmentRows: AppointmentTestRow[] = [baseAppointmentRow];

beforeEach(() => {
  availabilityRows = [{ ...baseAvailabilityRow }];
  exceptionRows = [];
  appointmentRows = [{ ...baseAppointmentRow }];
});

type QueryState = {
  filters: Array<{ type: "eq" | "neq"; field: string; value: unknown }>;
  orderBy: { field: string; ascending: boolean } | null;
  limit: number | null;
};

const applyQueryState = (table: string, state: QueryState) => {
  const sourceRows =
    table === "availability_blocks"
      ? availabilityRows
      : table === "availability_exceptions"
        ? exceptionRows
        : table === "appointments"
          ? appointmentRows
          : [];

  let rows = [...sourceRows];

  for (const filter of state.filters) {
    rows = rows.filter((row) => {
      if (filter.type === "eq") {
        return row[filter.field as keyof typeof row] === filter.value;
      }
      return row[filter.field as keyof typeof row] !== filter.value;
    });
  }

  if (state.orderBy) {
    const { field, ascending } = state.orderBy;
    rows.sort((left, right) => {
      const leftValue = left[field as keyof typeof left];
      const rightValue = right[field as keyof typeof right];

      if (leftValue === rightValue) return 0;
      if (leftValue == null) return ascending ? -1 : 1;
      if (rightValue == null) return ascending ? 1 : -1;
      return leftValue < rightValue === ascending ? -1 : 1;
    });
  }

  if (state.limit != null) {
    rows = rows.slice(0, state.limit);
  }

  return rows;
};

const buildQuery = (table: string) => {
  const state: QueryState = {
    filters: [],
    orderBy: null,
    limit: null,
  };
  const query = {
    select: () => query,
    eq: (field: string, value: unknown) => {
      state.filters.push({ type: "eq", field, value });
      return query;
    },
    neq: (field: string, value: unknown) => {
      state.filters.push({ type: "neq", field, value });
      return query;
    },
    lt: () => query,
    gt: () => query,
    lte: () => query,
    gte: () => query,
    order: (field: string, options?: { ascending?: boolean }) => {
      state.orderBy = { field, ascending: options?.ascending ?? true };
      return query;
    },
    limit: (value: number) => {
      state.limit = value;
      return query;
    },
    maybeSingle: () => query,
    then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) =>
      Promise.resolve({ data: applyQueryState(table, state), error: null }).then(resolve, reject),
  } as const;
  return query;
};

const supabaseMock = {
  from: (table: string) => {
    return buildQuery(table);
  },
};

vi.mock("@/lib/env", () => ({
  REGION: "test-region",
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseAdmin: () => supabaseMock,
}));

import { getProviderAvailabilityForDate } from "../actions";

describe("getProviderAvailabilityForDate", () => {
  it("removes slots that overlap scheduled appointments", async () => {
    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
    ]);
  });

  it("keeps slots when overlap is below capacity", async () => {
    availabilityRows = [{ ...baseAvailabilityRow, capacity: 2 }];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:00:00.000Z",
        endTime: "2026-02-16T14:30:00.000Z",
      },
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
    ]);
  });

  it("removes slots once capacity is full", async () => {
    availabilityRows = [{ ...baseAvailabilityRow, capacity: 2 }];
    appointmentRows = [
      { ...baseAppointmentRow },
      {
        ...baseAppointmentRow,
        id: "appt-2",
        start_time: "2026-02-16T14:00:00.000Z",
        end_time: "2026-02-16T14:30:00.000Z",
      },
    ];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
    ]);
  });

  it("returns no slots when a date exception closes availability", async () => {
    exceptionRows = [{ ...baseExceptionRow, is_closed: true, start_time: null, end_time: null }];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([]);
  });

  it("uses an open date exception instead of recurring availability", async () => {
    exceptionRows = [{ ...baseExceptionRow }];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T15:00:00.000Z",
        endTime: "2026-02-16T15:30:00.000Z",
      },
      {
        startTime: "2026-02-16T15:30:00.000Z",
        endTime: "2026-02-16T16:00:00.000Z",
      },
    ]);
  });

  it("applies exception capacity when generating slots", async () => {
    exceptionRows = [{ ...baseExceptionRow, capacity: 2 }];
    appointmentRows = [
      {
        ...baseAppointmentRow,
        id: "appt-2",
        start_time: "2026-02-16T15:00:00.000Z",
        end_time: "2026-02-16T15:30:00.000Z",
      },
    ];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T15:00:00.000Z",
        endTime: "2026-02-16T15:30:00.000Z",
      },
      {
        startTime: "2026-02-16T15:30:00.000Z",
        endTime: "2026-02-16T16:00:00.000Z",
      },
    ]);
  });

  it("counts only overlapping appointments for each slot when enforcing capacity", async () => {
    availabilityRows = [{ ...baseAvailabilityRow, capacity: 2 }];
    appointmentRows = [
      {
        ...baseAppointmentRow,
        id: "appt-1",
        start_time: "2026-02-16T14:00:00.000Z",
        end_time: "2026-02-16T14:30:00.000Z",
      },
      {
        ...baseAppointmentRow,
        id: "appt-2",
        start_time: "2026-02-16T14:15:00.000Z",
        end_time: "2026-02-16T14:45:00.000Z",
      },
    ];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
    ]);
  });

  it("treats adjacent appointments as non-overlapping half-open ranges", async () => {
    appointmentRows = [
      {
        ...baseAppointmentRow,
        id: "appt-before",
        start_time: "2026-02-16T13:30:00.000Z",
        end_time: "2026-02-16T14:00:00.000Z",
      },
      {
        ...baseAppointmentRow,
        id: "appt-after",
        start_time: "2026-02-16T15:00:00.000Z",
        end_time: "2026-02-16T15:30:00.000Z",
      },
    ];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:00:00.000Z",
        endTime: "2026-02-16T14:30:00.000Z",
      },
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
    ]);
  });

  it("ignores canceled appointments when counting capacity", async () => {
    appointmentRows = [
      {
        ...baseAppointmentRow,
        id: "appt-canceled",
        status: "canceled",
        start_time: "2026-02-16T14:00:00.000Z",
        end_time: "2026-02-16T14:30:00.000Z",
      },
    ];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:00:00.000Z",
        endTime: "2026-02-16T14:30:00.000Z",
      },
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
    ]);
  });

  it("dedupes overlapping recurring rules into a single sorted slot list", async () => {
    availabilityRows = [
      { ...baseAvailabilityRow, id: "block-1" },
      {
        ...baseAvailabilityRow,
        id: "block-2",
        start_time: "14:30:00",
        end_time: "15:30:00",
      },
    ];
    appointmentRows = [];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T14:00:00.000Z",
        endTime: "2026-02-16T14:30:00.000Z",
      },
      {
        startTime: "2026-02-16T14:30:00.000Z",
        endTime: "2026-02-16T15:00:00.000Z",
      },
      {
        startTime: "2026-02-16T15:00:00.000Z",
        endTime: "2026-02-16T15:30:00.000Z",
      },
    ]);
  });

  it("uses the latest exception row when multiple exceptions exist for a date", async () => {
    exceptionRows = [
      { ...baseExceptionRow, id: "exception-older", created_at: "2026-02-01T00:00:00.000Z" },
      {
        ...baseExceptionRow,
        id: "exception-newer",
        start_time: "16:00:00",
        end_time: "17:00:00",
        created_at: "2026-02-02T00:00:00.000Z",
      },
    ];
    appointmentRows = [];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([
      {
        startTime: "2026-02-16T16:00:00.000Z",
        endTime: "2026-02-16T16:30:00.000Z",
      },
      {
        startTime: "2026-02-16T16:30:00.000Z",
        endTime: "2026-02-16T17:00:00.000Z",
      },
    ]);
  });

  it("lets the latest closed exception override earlier open exceptions and recurring rules", async () => {
    exceptionRows = [
      { ...baseExceptionRow, id: "exception-open", created_at: "2026-02-01T00:00:00.000Z" },
      {
        ...baseExceptionRow,
        id: "exception-closed",
        is_closed: true,
        start_time: null,
        end_time: null,
        created_at: "2026-02-02T00:00:00.000Z",
      },
    ];
    appointmentRows = [];

    const slots = await getProviderAvailabilityForDate({
      businessId: "biz-1",
      providerId: "staff-1",
      date: "2026-02-16",
    });

    expect(slots).toEqual([]);
  });
});
