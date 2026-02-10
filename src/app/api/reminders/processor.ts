import { ProviderConfigurationError } from "@/lib/email/sendAppointmentReminderEmail";

export type ReminderAppointmentRow = {
  id: string;
  business_id: string;
  service_id: string;
  staff_id: string | null;
  customer_id: string;
  start_time: string;
  status: string;
};

export type ReminderEventRow = {
  id: string;
  appointment_id: string;
  reminder_type: string;
  channel: string;
  scheduled_for: string;
  status: string;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  last_error?: unknown;
  meta: unknown;
};

export type ReminderLookup = {
  service: { id: string; name: string };
  provider: { id: string; full_name: string | null } | null;
  customer: { id: string; full_name: string; email: string };
};

export type ReminderLogger = {
  info: (message: string, fields: Record<string, unknown>) => void;
  error: (message: string, fields: Record<string, unknown>) => void;
};

type ReminderResult<T> = {
  data: T | null;
  error: unknown | null;
};

export type ReminderProcessorDeps = {
  upsertEvent: (input: {
    appointmentId: string;
    reminderType: string;
    channel: string;
    scheduledFor: string;
    meta: Record<string, unknown>;
  }) => Promise<ReminderResult<ReminderEventRow>>;
  claimEvent: (input: {
    reminderEventId: string;
    lockTimeoutSeconds: number;
    now: Date;
    maxAttempts: number;
  }) => Promise<ReminderResult<ReminderEventRow>>;
  markSent: (input: {
    reminderEventId: string;
    providerMessageId: string | null;
    sentAt: Date;
  }) => Promise<ReminderResult<ReminderEventRow>>;
  markFailed: (input: {
    reminderEventId: string;
    status: "retry" | "failed";
    nextAttemptAt: Date | null;
    error: Record<string, unknown>;
  }) => Promise<ReminderResult<ReminderEventRow>>;
  loadLookups: (input: {
    appointment: ReminderAppointmentRow;
  }) => Promise<ReminderResult<ReminderLookup>>;
  sendReminder: (input: {
    to: string;
    service: string;
    provider: string;
    startTime: string;
    hoursBefore: number;
  }) => Promise<{ messageId?: string | null }>;
  now: () => Date;
  logger: ReminderLogger;
  jobRunId: string;
  region: string;
  hoursBefore: number;
  reminderType: string;
  channel: string;
  maxAttempts: number;
  lockTimeoutSeconds: number;
  baseRetryMinutes: number;
  maxRetryMinutes: number;
};

type ErrorInfo = {
  isPermanent: boolean;
  statusCode?: number;
  reason: string;
};

const isDateAfter = (value: string | null, now: Date) => {
  if (!value) return false;
  return new Date(value).getTime() > now.getTime();
};

const computeBackoffMinutes = (
  attempt: number,
  baseMinutes: number,
  maxMinutes: number,
) => {
  const backoff = baseMinutes * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(backoff, maxMinutes);
};

const extractStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const anyError = error as { statusCode?: number; status?: number; code?: string };
  if (typeof anyError.statusCode === "number") return anyError.statusCode;
  if (typeof anyError.status === "number") return anyError.status;
  if (typeof anyError.code === "string") {
    const parsed = Number(anyError.code);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const isPermanentFailure = (error: unknown): ErrorInfo => {
  if (error instanceof ProviderConfigurationError) {
    return { isPermanent: true, reason: "provider_not_configured" };
  }

  const statusCode = extractStatusCode(error);
  if (statusCode !== undefined) {
    if (statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429) {
      return { isPermanent: true, statusCode, reason: "provider_4xx" };
    }
  }

  const message =
    typeof (error as { message?: unknown })?.message === "string"
      ? String((error as { message?: unknown }).message).toLowerCase()
      : "";

  if (message.includes("validation") || message.includes("invalid")) {
    return { isPermanent: true, reason: "validation_error" };
  }

  return { isPermanent: false, statusCode, reason: "transient_error" };
};

const serializeError = (error: unknown) => {
  if (!error) return { message: "unknown_error" };
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object") {
    return { ...error } as Record<string, unknown>;
  }
  return { message: String(error) };
};

export async function processAppointmentReminder(
  deps: ReminderProcessorDeps,
  appointment: ReminderAppointmentRow,
) {
  const startTime = deps.now();
  const scheduledFor = new Date(
    new Date(appointment.start_time).getTime() - deps.hoursBefore * 60 * 60 * 1000,
  ).toISOString();
  const idempotencyKey = `${appointment.id}:${deps.reminderType}:${deps.channel}:${scheduledFor}`;
  const logBase = {
    job_run_id: deps.jobRunId,
    business_id: appointment.business_id,
    appointment_id: appointment.id,
    reminder_type: deps.reminderType,
    channel: deps.channel,
    scheduled_for: scheduledFor,
    idempotency_key: idempotencyKey,
  };

  const { data: reminderEvent, error: upsertError } = await deps.upsertEvent({
    appointmentId: appointment.id,
    reminderType: deps.reminderType,
    channel: deps.channel,
    scheduledFor,
    meta: { hoursBefore: deps.hoursBefore, region: deps.region, idempotencyKey },
  });

  if (upsertError || !reminderEvent) {
    deps.logger.error("reminder.event_upsert_failed", {
      ...logBase,
      outcome: "event_upsert_failed",
      error: serializeError(upsertError),
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "event_upsert_failed" };
  }

  const reminderId = reminderEvent.id;
  const attemptBase = {
    ...logBase,
    reminder_id: reminderId,
    attempt: reminderEvent.attempt_count,
  };

  if (reminderEvent.status === "sent") {
    deps.logger.info("reminder.skip_already_sent", {
      ...attemptBase,
      outcome: "skipped_already_sent",
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "skipped_already_sent" };
  }

  if (reminderEvent.status === "failed") {
    deps.logger.info("reminder.skip_permanent_failure", {
      ...attemptBase,
      outcome: "skipped_permanent_failure",
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "skipped_permanent_failure" };
  }

  if (isDateAfter(reminderEvent.next_attempt_at, deps.now())) {
    deps.logger.info("reminder.skip_not_due", {
      ...attemptBase,
      outcome: "skipped_not_due",
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "skipped_not_due" };
  }

  if (reminderEvent.attempt_count >= deps.maxAttempts) {
    deps.logger.info("reminder.skip_max_attempts", {
      ...attemptBase,
      outcome: "skipped_max_attempts",
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "skipped_max_attempts" };
  }

  const { data: claimedEvent, error: claimError } = await deps.claimEvent({
    reminderEventId: reminderId,
    lockTimeoutSeconds: deps.lockTimeoutSeconds,
    now: deps.now(),
    maxAttempts: deps.maxAttempts,
  });

  if (claimError) {
    deps.logger.error("reminder.claim_failed", {
      ...attemptBase,
      outcome: "claim_failed",
      error: serializeError(claimError),
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "claim_failed" };
  }

  if (!claimedEvent) {
    deps.logger.info("reminder.skip_claimed", {
      ...attemptBase,
      outcome: "skipped_claimed",
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "skipped_claimed" };
  }

  const attempt = claimedEvent.attempt_count;
  const attemptLog = {
    ...attemptBase,
    attempt,
  };

  const { data: lookupData, error: lookupError } = await deps.loadLookups({
    appointment,
  });

  if (lookupError || !lookupData) {
    await deps.markFailed({
      reminderEventId: reminderId,
      status: "failed",
      nextAttemptAt: null,
      error: {
        reason: "lookup_failed",
        detail: serializeError(lookupError),
      },
    });
    deps.logger.error("reminder.lookup_failed", {
      ...attemptLog,
      outcome: "lookup_failed",
      error: serializeError(lookupError),
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "lookup_failed" };
  }

  try {
    const response = await deps.sendReminder({
      to: lookupData.customer.email,
      service: lookupData.service.name,
      provider: lookupData.provider?.full_name ?? "Provider",
      startTime: appointment.start_time,
      hoursBefore: deps.hoursBefore,
    });

    const { error: markSentError } = await deps.markSent({
      reminderEventId: reminderId,
      providerMessageId: response.messageId ?? null,
      sentAt: deps.now(),
    });

    if (markSentError) {
      deps.logger.error("reminder.mark_sent_failed", {
        ...attemptLog,
        outcome: "mark_sent_failed",
        error: serializeError(markSentError),
        duration_ms: deps.now().getTime() - startTime.getTime(),
      });
      return { appointmentId: appointment.id, status: "mark_sent_failed" };
    }

    deps.logger.info("reminder.sent", {
      ...attemptLog,
      outcome: "sent",
      provider_message_id: response.messageId ?? null,
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });
    return { appointmentId: appointment.id, status: "sent" };
  } catch (error) {
    const errorInfo = isPermanentFailure(error);
    const isPermanent = errorInfo.isPermanent || attempt >= deps.maxAttempts;
    const status: "retry" | "failed" = isPermanent ? "failed" : "retry";
    const nextAttemptAt = isPermanent
      ? null
      : new Date(
          deps.now().getTime() +
            computeBackoffMinutes(attempt, deps.baseRetryMinutes, deps.maxRetryMinutes) *
              60 *
              1000,
        );

    await deps.markFailed({
      reminderEventId: reminderId,
      status,
      nextAttemptAt,
      error: {
        reason: errorInfo.reason,
        statusCode: errorInfo.statusCode,
        detail: serializeError(error),
      },
    });

    deps.logger.error("reminder.send_failed", {
      ...attemptLog,
      outcome: status === "retry" ? "retry_scheduled" : "failed_permanent",
      status_code: errorInfo.statusCode,
      error: serializeError(error),
      next_attempt_at: nextAttemptAt?.toISOString() ?? null,
      duration_ms: deps.now().getTime() - startTime.getTime(),
    });

    return { appointmentId: appointment.id, status: status === "retry" ? "retry" : "failed" };
  }
}
