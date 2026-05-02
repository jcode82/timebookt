"use client";

import React, { useEffect, useState, useTransition, type FormEvent } from "react";
import type { ZodError } from "zod";
import type { AvailabilityBlock } from "@/domain/appointments";
import {
  createDashboardAvailabilityAction,
  deleteDashboardAvailabilityAction,
  updateDashboardAvailabilityAction,
} from "@/features/dashboard/api/availabilityActions";
import {
  createDashboardAvailabilitySchema,
  updateDashboardAvailabilitySchema,
  type AvailabilityFormValues,
  type CreateDashboardAvailabilityInput,
  type UpdateDashboardAvailabilityInput,
} from "@/features/dashboard/utils/availabilityManagementSchema";
import { formatAvailabilityDay } from "@/features/dashboard/utils/formatters";

interface AvailabilityPanelProps {
  businessId: string;
  businessSlug: string;
  availability: AvailabilityBlock[];
}

type AvailabilityFieldErrors = Partial<Record<keyof AvailabilityFormValues, string>>;

const weekdayOptions = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

const emptyForm = (): AvailabilityFormValues => ({
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "17:00",
  capacity: "1",
});

function toInputTime(value: string) {
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours}:${minutes}`;
}

function toFormValues(block: AvailabilityBlock): AvailabilityFormValues {
  return {
    dayOfWeek: String(block.dayOfWeek),
    startTime: toInputTime(block.startTime),
    endTime: toInputTime(block.endTime),
    capacity: String(block.capacity),
  };
}

function getFieldErrors(error: ZodError): AvailabilityFieldErrors {
  const flattened = error.flatten();

  return {
    dayOfWeek: flattened.fieldErrors.dayOfWeek?.[0],
    startTime: flattened.fieldErrors.startTime?.[0],
    endTime: flattened.fieldErrors.endTime?.[0],
    capacity: flattened.fieldErrors.capacity?.[0],
  };
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function blocksOverlap(a: AvailabilityFormValues, b: AvailabilityFormValues) {
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime);
}

function getOverlapMessage(
  values: AvailabilityFormValues,
  blocks: AvailabilityBlock[],
  editingBlockId: string | null,
) {
  const matchingBlock = blocks.find((block) => {
    if (block.id === editingBlockId) {
      return false;
    }

    if (String(block.dayOfWeek) !== values.dayOfWeek) {
      return false;
    }

    return blocksOverlap(values, toFormValues(block));
  });

  if (!matchingBlock) {
    return null;
  }

  return `Overlaps with ${formatAvailabilityDay(matchingBlock.dayOfWeek)} ${toInputTime(
    matchingBlock.startTime,
  )}-${toInputTime(matchingBlock.endTime)}.`;
}

function compareBlocks(a: AvailabilityBlock, b: AvailabilityBlock) {
  if (a.dayOfWeek !== b.dayOfWeek) {
    return a.dayOfWeek - b.dayOfWeek;
  }

  return a.startTime.localeCompare(b.startTime);
}

function sortBlocks(blocks: AvailabilityBlock[]) {
  return [...blocks].sort(compareBlocks);
}

export function AvailabilityPanel({
  businessId,
  businessSlug,
  availability: initialAvailability,
}: AvailabilityPanelProps) {
  const [pending, startTransition] = useTransition();
  const [availability, setAvailability] = useState(sortBlocks(initialAvailability));
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormValues>(emptyForm);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AvailabilityFieldErrors>({});

  useEffect(() => {
    setAvailability(sortBlocks(initialAvailability));
  }, [initialAvailability]);

  const resetForm = () => {
    setAvailabilityForm(emptyForm());
    setEditingBlockId(null);
    setFieldErrors({});
  };

  const handleFieldChange = (field: keyof AvailabilityFormValues, value: string) => {
    setAvailabilityForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
    setMessage(null);
  };

  const handleCreate = (payload: CreateDashboardAvailabilityInput) => {
    const result = createDashboardAvailabilitySchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setMessage(result.error.issues[0]?.message ?? "Please review the availability details");
      return;
    }

    startTransition(async () => {
      const actionResult = await createDashboardAvailabilityAction(payload);
      if (!actionResult.ok) {
        setMessage(actionResult.message);
        return;
      }

      setAvailability((prev) => sortBlocks([...prev, actionResult.availabilityBlock]));
      resetForm();
      setMessage("Availability block added.");
    });
  };

  const handleUpdate = (payload: UpdateDashboardAvailabilityInput) => {
    const result = updateDashboardAvailabilitySchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setMessage(result.error.issues[0]?.message ?? "Please review the availability details");
      return;
    }

    startTransition(async () => {
      const actionResult = await updateDashboardAvailabilityAction(payload);
      if (!actionResult.ok) {
        setMessage(actionResult.message);
        return;
      }

      setAvailability((prev) =>
        sortBlocks(
          prev.map((block) =>
            block.id === actionResult.availabilityBlock.id ? actionResult.availabilityBlock : block,
          ),
        ),
      );
      resetForm();
      setMessage("Availability block updated.");
    });
  };

  const handleDelete = (availabilityBlockId: string) => {
    startTransition(async () => {
      const result = await deleteDashboardAvailabilityAction({
        availabilityBlockId,
        businessId,
        businessSlug,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setAvailability((prev) => prev.filter((block) => block.id !== availabilityBlockId));
      if (editingBlockId === availabilityBlockId) {
        resetForm();
      }
      setMessage("Availability block removed.");
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    const overlapMessage = getOverlapMessage(availabilityForm, availability, editingBlockId);
    if (overlapMessage) {
      setFieldErrors({ endTime: overlapMessage });
      setMessage(overlapMessage);
      return;
    }

    if (editingBlockId) {
      handleUpdate({
        availabilityBlockId: editingBlockId,
        businessId,
        businessSlug,
        ...availabilityForm,
      });
      return;
    }

    handleCreate({
      businessId,
      businessSlug,
      ...availabilityForm,
    });
  };

  const selectForEdit = (block: AvailabilityBlock) => {
    setEditingBlockId(block.id);
    setAvailabilityForm(toFormValues(block));
    setFieldErrors({});
    setMessage(null);
  };

  return (
    <section id="availability" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Availability</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Weekly schedule</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage recurring weekly blocks with start and end times plus capacity. Times are stored in
            UTC to match current scheduling rules.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active blocks</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{availability.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-3">
          {availability.map((block) => (
            <article key={block.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{formatAvailabilityDay(block.dayOfWeek)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {toInputTime(block.startTime)} - {toInputTime(block.endTime)}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Capacity {block.capacity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectForEdit(block)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pending}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(block.id)}
                    className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pending}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}

          {availability.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No recurring availability is configured yet.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {editingBlockId ? "Edit availability block" : "Add availability block"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Use a recurring weekly pattern instead of date-specific entries.
              </p>
            </div>
            {editingBlockId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Day of week</span>
              <select
                value={availabilityForm.dayOfWeek}
                onChange={(event) => handleFieldChange("dayOfWeek", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                disabled={pending}
              >
                {weekdayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.dayOfWeek && <p className="mt-2 text-xs text-rose-600">{fieldErrors.dayOfWeek}</p>}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Start time</span>
                <input
                  type="time"
                  value={availabilityForm.startTime}
                  onChange={(event) => handleFieldChange("startTime", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  step={60}
                  disabled={pending}
                />
                {fieldErrors.startTime && <p className="mt-2 text-xs text-rose-600">{fieldErrors.startTime}</p>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">End time</span>
                <input
                  type="time"
                  value={availabilityForm.endTime}
                  onChange={(event) => handleFieldChange("endTime", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  step={60}
                  disabled={pending}
                />
                {fieldErrors.endTime && <p className="mt-2 text-xs text-rose-600">{fieldErrors.endTime}</p>}
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Capacity</span>
              <input
                value={availabilityForm.capacity}
                onChange={(event) => handleFieldChange("capacity", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                inputMode="numeric"
                placeholder="1"
                disabled={pending}
              />
              {fieldErrors.capacity && <p className="mt-2 text-xs text-rose-600">{fieldErrors.capacity}</p>}
            </label>
          </div>

          {message && (
            <p
              className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                message.includes("added") || message.includes("updated") || message.includes("removed")
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
            >
              {pending
                ? editingBlockId
                  ? "Saving..."
                  : "Adding..."
                : editingBlockId
                  ? "Save changes"
                  : "Add block"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
