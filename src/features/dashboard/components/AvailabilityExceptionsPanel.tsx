"use client";

import React, { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import type { ZodError } from "zod";
import type { AvailabilityException } from "@/domain/appointments";
import type { StaffMember } from "@/domain/businesses";
import {
  createDashboardAvailabilityExceptionAction,
  deleteDashboardAvailabilityExceptionAction,
  updateDashboardAvailabilityExceptionAction,
} from "@/features/dashboard/api/availabilityActions";
import {
  createDashboardAvailabilityExceptionSchema,
  updateDashboardAvailabilityExceptionSchema,
  type AvailabilityExceptionFormValues,
  type CreateDashboardAvailabilityExceptionInput,
  type UpdateDashboardAvailabilityExceptionInput,
} from "@/features/dashboard/utils/availabilityManagementSchema";

interface AvailabilityExceptionsPanelProps {
  businessId: string;
  businessSlug: string;
  staffMembers: StaffMember[];
  availabilityExceptions: AvailabilityException[];
}

type AvailabilityExceptionFieldErrors = Partial<Record<keyof AvailabilityExceptionFormValues, string>>;
type MessageTone = "success" | "error";

const emptyForm = (defaultStaffId: string): AvailabilityExceptionFormValues => ({
  staffId: defaultStaffId,
  exceptionDate: "",
  overrideType: "closed",
  startTime: "09:00",
  endTime: "17:00",
  capacity: "1",
});

function toInputTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours}:${minutes}`;
}

function toFormValues(exception: AvailabilityException): AvailabilityExceptionFormValues {
  return {
    staffId: exception.staffId,
    exceptionDate: exception.exceptionDate,
    overrideType: exception.isClosed ? "closed" : "open",
    startTime: toInputTime(exception.startTime) || "09:00",
    endTime: toInputTime(exception.endTime) || "17:00",
    capacity: String(exception.capacity),
  };
}

function getFieldErrors(error: ZodError): AvailabilityExceptionFieldErrors {
  const flattened = error.flatten();

  return {
    staffId: flattened.fieldErrors.staffId?.[0],
    exceptionDate: flattened.fieldErrors.exceptionDate?.[0],
    overrideType: flattened.fieldErrors.overrideType?.[0],
    startTime: flattened.fieldErrors.startTime?.[0],
    endTime: flattened.fieldErrors.endTime?.[0],
    capacity: flattened.fieldErrors.capacity?.[0],
  };
}

function compareExceptions(a: AvailabilityException, b: AvailabilityException) {
  if (a.exceptionDate !== b.exceptionDate) {
    return a.exceptionDate.localeCompare(b.exceptionDate);
  }

  if (a.staffId !== b.staffId) {
    return a.staffId.localeCompare(b.staffId);
  }

  return b.createdAt.localeCompare(a.createdAt);
}

function sortExceptions(exceptions: AvailabilityException[]) {
  return [...exceptions].sort(compareExceptions);
}

function formatExceptionDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
}

export function AvailabilityExceptionsPanel({
  businessId,
  businessSlug,
  staffMembers,
  availabilityExceptions: initialAvailabilityExceptions,
}: AvailabilityExceptionsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [availabilityExceptions, setAvailabilityExceptions] = useState(
    sortExceptions(initialAvailabilityExceptions),
  );
  const [editingExceptionId, setEditingExceptionId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AvailabilityExceptionFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const defaultStaffId = staffMembers[0]?.id ?? "";
  const [formValues, setFormValues] = useState<AvailabilityExceptionFormValues>(emptyForm(defaultStaffId));

  useEffect(() => {
    setAvailabilityExceptions(sortExceptions(initialAvailabilityExceptions));
  }, [initialAvailabilityExceptions]);

  useEffect(() => {
    if (editingExceptionId || formValues.staffId || !defaultStaffId) {
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      staffId: defaultStaffId,
    }));
  }, [defaultStaffId, editingExceptionId, formValues.staffId]);

  const staffNameById = useMemo(
    () => new Map(staffMembers.map((staffMember) => [staffMember.id, staffMember.fullName] as const)),
    [staffMembers],
  );

  const resetForm = () => {
    setEditingExceptionId(null);
    setFieldErrors({});
    setFormValues(emptyForm(defaultStaffId));
  };

  const handleFieldChange = (field: keyof AvailabilityExceptionFormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
    setMessage(null);
  };

  const handleCreate = (payload: CreateDashboardAvailabilityExceptionInput) => {
    const result = createDashboardAvailabilityExceptionSchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setMessageTone("error");
      setMessage(result.error.issues[0]?.message ?? "Please review the exception details");
      return;
    }

    startTransition(async () => {
      const actionResult = await createDashboardAvailabilityExceptionAction(payload);
      if (!actionResult.ok) {
        setMessageTone("error");
        setMessage(actionResult.message);
        return;
      }

      setAvailabilityExceptions((prev) => sortExceptions([...prev, actionResult.availabilityException]));
      resetForm();
      setMessageTone("success");
      setMessage("Availability exception added.");
    });
  };

  const handleUpdate = (payload: UpdateDashboardAvailabilityExceptionInput) => {
    const result = updateDashboardAvailabilityExceptionSchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setMessageTone("error");
      setMessage(result.error.issues[0]?.message ?? "Please review the exception details");
      return;
    }

    startTransition(async () => {
      const actionResult = await updateDashboardAvailabilityExceptionAction(payload);
      if (!actionResult.ok) {
        setMessageTone("error");
        setMessage(actionResult.message);
        return;
      }

      setAvailabilityExceptions((prev) =>
        sortExceptions(
          prev.map((exception) =>
            exception.id === actionResult.availabilityException.id
              ? actionResult.availabilityException
              : exception,
          ),
        ),
      );
      resetForm();
      setMessageTone("success");
      setMessage("Availability exception updated.");
    });
  };

  const handleDelete = (availabilityExceptionId: string) => {
    startTransition(async () => {
      const result = await deleteDashboardAvailabilityExceptionAction({
        availabilityExceptionId,
        businessId,
        businessSlug,
      });

      if (!result.ok) {
        setMessageTone("error");
        setMessage(result.message);
        return;
      }

      setAvailabilityExceptions((prev) =>
        prev.filter((availabilityException) => availabilityException.id !== availabilityExceptionId),
      );
      if (editingExceptionId === availabilityExceptionId) {
        resetForm();
      }
      setMessageTone("success");
      setMessage("Availability exception removed.");
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    if (editingExceptionId) {
      handleUpdate({
        availabilityExceptionId: editingExceptionId,
        businessId,
        businessSlug,
        ...formValues,
      });
      return;
    }

    handleCreate({
      businessId,
      businessSlug,
      ...formValues,
    });
  };

  const selectForEdit = (availabilityException: AvailabilityException) => {
    setEditingExceptionId(availabilityException.id);
    setFormValues(toFormValues(availabilityException));
    setFieldErrors({});
    setMessage(null);
  };

  return (
    <section
      id="availability-exceptions"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Overrides</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Availability exceptions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Block a specific date or replace recurring weekly rules with a one-day custom window.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Scheduled overrides</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{availabilityExceptions.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-3">
          {availabilityExceptions.map((availabilityException) => {
            const providerName =
              staffNameById.get(availabilityException.staffId) ?? "Unknown provider";

            return (
              <article
                key={availabilityException.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{formatExceptionDate(availabilityException.exceptionDate)}</p>
                    <p className="mt-1 text-sm text-slate-600">{providerName}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {availabilityException.isClosed
                        ? "Blocked date"
                        : `${toInputTime(availabilityException.startTime)} - ${toInputTime(
                            availabilityException.endTime,
                          )} | Capacity ${availabilityException.capacity}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectForEdit(availabilityException)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={pending}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(availabilityException.id)}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={pending}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {availabilityExceptions.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No date overrides are configured yet.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {editingExceptionId ? "Edit date override" : "Add date override"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Date overrides always win over recurring weekly availability.
              </p>
            </div>
            {editingExceptionId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Cancel
              </button>
            )}
          </div>

          {staffMembers.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              No providers are configured for this business yet, so date overrides cannot be added.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Provider</span>
                <select
                  value={formValues.staffId}
                  onChange={(event) => handleFieldChange("staffId", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  disabled={pending}
                >
                  {staffMembers.map((staffMember) => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.fullName}
                    </option>
                  ))}
                </select>
                {fieldErrors.staffId && <p className="mt-2 text-xs text-rose-600">{fieldErrors.staffId}</p>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  value={formValues.exceptionDate}
                  onChange={(event) => handleFieldChange("exceptionDate", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  disabled={pending}
                />
                {fieldErrors.exceptionDate && (
                  <p className="mt-2 text-xs text-rose-600">{fieldErrors.exceptionDate}</p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Override type</span>
                <select
                  value={formValues.overrideType}
                  onChange={(event) => handleFieldChange("overrideType", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  disabled={pending}
                >
                  <option value="closed">Block date</option>
                  <option value="open">Custom availability</option>
                </select>
                {fieldErrors.overrideType && (
                  <p className="mt-2 text-xs text-rose-600">{fieldErrors.overrideType}</p>
                )}
              </label>

              {formValues.overrideType === "open" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Start time</span>
                      <input
                        type="time"
                        value={formValues.startTime}
                        onChange={(event) => handleFieldChange("startTime", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                        step={60}
                        disabled={pending}
                      />
                      {fieldErrors.startTime && (
                        <p className="mt-2 text-xs text-rose-600">{fieldErrors.startTime}</p>
                      )}
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">End time</span>
                      <input
                        type="time"
                        value={formValues.endTime}
                        onChange={(event) => handleFieldChange("endTime", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                        step={60}
                        disabled={pending}
                      />
                      {fieldErrors.endTime && (
                        <p className="mt-2 text-xs text-rose-600">{fieldErrors.endTime}</p>
                      )}
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Capacity</span>
                    <input
                      value={formValues.capacity}
                      onChange={(event) => handleFieldChange("capacity", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                      inputMode="numeric"
                      placeholder="1"
                      disabled={pending}
                    />
                    {fieldErrors.capacity && (
                      <p className="mt-2 text-xs text-rose-600">{fieldErrors.capacity}</p>
                    )}
                  </label>
                </>
              )}
            </div>
          )}

          {message && (
            <p
              className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                messageTone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending || staffMembers.length === 0}
            >
              {pending
                ? editingExceptionId
                  ? "Saving..."
                  : "Adding..."
                : editingExceptionId
                  ? "Save changes"
                  : "Add override"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
