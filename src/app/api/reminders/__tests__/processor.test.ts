import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  processAppointmentReminder,
  type ReminderAppointmentRow,
  type ReminderEventRow,
  type ReminderLogger,
  type ReminderProcessorDeps,
} from "../processor";
import { ProviderConfigurationError } from "@/lib/email/sendAppointmentReminderEmail";

type InMemoryStore = {
  eventsByKey: Map<string, ReminderEventRow>;
  eventsById: Map<string, ReminderEventRow>;
  idCounter: number;
};

const baseAppointment: ReminderAppointmentRow = {
  id: "appt-1",
  business_id: "biz-1",
  service_id: "svc-1",
  staff_id: "staff-1",
  customer_id: "cust-1",
  start_time: "2026-02-12T10:00:00.000Z",
  status: "scheduled",
};

const createStore = (): InMemoryStore => ({
  eventsByKey: new Map(),
  eventsById: new Map(),
  idCounter: 1,
});

const cloneEvent = (event: ReminderEventRow): ReminderEventRow => ({ ...event });

const buildDeps = (store: InMemoryStore, overrides?: Partial<ReminderProcessorDeps>) => {
  let nowMs = Date.parse("2026-02-10T10:00:00.000Z");
  const loggerCalls: Array<{ level: "info" | "error"; message: string; fields: Record<string, unknown> }> =
    [];
  const logger: ReminderLogger = {
    info: (message, fields) => loggerCalls.push({ level: "info", message, fields }),
    error: (message, fields) => loggerCalls.push({ level: "error", message, fields }),
  };

  const deps: ReminderProcessorDeps = {
    upsertEvent: async ({ appointmentId, reminderType, channel, scheduledFor, meta }) => {
      const key = `${appointmentId}:${reminderType}:${channel}:${scheduledFor}`;
      const existing = store.eventsByKey.get(key);
      if (existing) {
        return { data: cloneEvent(existing), error: null };
      }
      const id = `rem-${store.idCounter++}`;
      const created: ReminderEventRow = {
        id,
        appointment_id: appointmentId,
        reminder_type: reminderType,
        channel,
        scheduled_for: scheduledFor,
        status: "scheduled",
        attempt_count: 0,
        last_attempt_at: null,
        next_attempt_at: null,
        sent_at: null,
        provider_message_id: null,
        meta,
      };
      store.eventsByKey.set(key, created);
      store.eventsById.set(id, created);
      return { data: cloneEvent(created), error: null };
    },
    claimEvent: async ({ reminderEventId, lockTimeoutSeconds, now, maxAttempts }) => {
      const existing = store.eventsById.get(reminderEventId);
      if (!existing) return { data: null, error: null };
      const lockCutoff = now.getTime() - lockTimeoutSeconds * 1000;
      if (existing.status === "sent") return { data: null, error: null };
      if (existing.status === "failed") return { data: null, error: null };
      if (existing.attempt_count >= maxAttempts) return { data: null, error: null };
      if (existing.next_attempt_at && new Date(existing.next_attempt_at).getTime() > now.getTime()) {
        return { data: null, error: null };
      }
      if (
        existing.status === "sending" &&
        existing.last_attempt_at &&
        new Date(existing.last_attempt_at).getTime() > lockCutoff
      ) {
        return { data: null, error: null };
      }
      const updated = {
        ...existing,
        status: "sending",
        attempt_count: existing.attempt_count + 1,
        last_attempt_at: now.toISOString(),
      };
      store.eventsById.set(reminderEventId, updated);
      store.eventsByKey.set(
        `${updated.appointment_id}:${updated.reminder_type}:${updated.channel}:${updated.scheduled_for}`,
        updated,
      );
      return { data: cloneEvent(updated), error: null };
    },
    markSent: async ({ reminderEventId, providerMessageId, sentAt }) => {
      const existing = store.eventsById.get(reminderEventId);
      if (!existing) return { data: null, error: null };
      const updated = {
        ...existing,
        status: "sent",
        sent_at: sentAt.toISOString(),
        provider_message_id: providerMessageId,
      };
      store.eventsById.set(reminderEventId, updated);
      store.eventsByKey.set(
        `${updated.appointment_id}:${updated.reminder_type}:${updated.channel}:${updated.scheduled_for}`,
        updated,
      );
      return { data: cloneEvent(updated), error: null };
    },
    markFailed: async ({ reminderEventId, status, nextAttemptAt, error }) => {
      const existing = store.eventsById.get(reminderEventId);
      if (!existing) return { data: null, error: null };
      const updated = {
        ...existing,
        status,
        next_attempt_at: nextAttemptAt?.toISOString() ?? null,
        last_error: error,
      };
      store.eventsById.set(reminderEventId, updated);
      store.eventsByKey.set(
        `${updated.appointment_id}:${updated.reminder_type}:${updated.channel}:${updated.scheduled_for}`,
        updated,
      );
      return { data: cloneEvent(updated), error: null };
    },
    loadLookups: async () => ({
      data: {
        service: { id: "svc-1", name: "Haircut" },
        provider: { id: "staff-1", full_name: "Taylor Stylist" },
        customer: { id: "cust-1", full_name: "Jordan Client", email: "jordan@example.com" },
      },
      error: null,
    }),
    sendReminder: vi.fn().mockResolvedValue({ messageId: "msg-1" }),
    now: () => new Date(nowMs),
    logger,
    jobRunId: "job-123",
    region: "test-region",
    hoursBefore: 24,
    reminderType: "lead_24h",
    channel: "email",
    maxAttempts: 3,
    lockTimeoutSeconds: 600,
    baseRetryMinutes: 5,
    maxRetryMinutes: 60,
  };

  return {
    deps: { ...deps, ...(overrides ?? {}) },
    loggerCalls,
    setNow: (value: string) => {
      nowMs = Date.parse(value);
    },
  };
};

describe("processAppointmentReminder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("dedupes reminder sends on subsequent runs", async () => {
    const store = createStore();
    const { deps } = buildDeps(store);

    const first = await processAppointmentReminder(deps, baseAppointment);
    const second = await processAppointmentReminder(deps, baseAppointment);

    expect(first.status).toBe("sent");
    expect(second.status).toBe("skipped_already_sent");
    expect((deps.sendReminder as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(store.eventsById.size).toBe(1);
  });

  it("retries with backoff without duplicating sends", async () => {
    const store = createStore();
    const { deps, setNow } = buildDeps(store);
    const sendMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary provider error"))
      .mockResolvedValueOnce({ messageId: "msg-2" });
    deps.sendReminder = sendMock;

    const first = await processAppointmentReminder(deps, baseAppointment);
    expect(first.status).toBe("retry");

    setNow("2026-02-10T10:06:00.000Z");

    const second = await processAppointmentReminder(deps, baseAppointment);
    expect(second.status).toBe("sent");
    expect(sendMock).toHaveBeenCalledTimes(2);

    const event = Array.from(store.eventsById.values())[0];
    expect(event.status).toBe("sent");
    expect(event.attempt_count).toBe(2);
  });

  it("logs permanent failure and skips on re-run", async () => {
    const store = createStore();
    const { deps, loggerCalls } = buildDeps(store, {
      sendReminder: vi.fn().mockRejectedValue(new ProviderConfigurationError("missing config")),
    });

    const first = await processAppointmentReminder(deps, baseAppointment);
    const second = await processAppointmentReminder(deps, baseAppointment);

    expect(first.status).toBe("failed");
    expect(second.status).toBe("skipped_permanent_failure");

    const errorLog = loggerCalls.find((entry) => entry.level === "error");
    expect(errorLog).toBeTruthy();
    expect(errorLog?.fields).toEqual(
      expect.objectContaining({
        job_run_id: "job-123",
        business_id: "biz-1",
        appointment_id: "appt-1",
        reminder_id: expect.any(String),
        attempt: expect.any(Number),
        outcome: "failed_permanent",
      }),
    );
  });
});
