"use client";

import React, { useEffect, useState, useTransition } from "react";
import type { AppointmentAdminRecord, AppointmentStatus } from "@/domain/appointments";
import { formatDashboardDateTime } from "@/features/dashboard/utils/formatters";

interface AppointmentsPanelProps {
  businessId: string;
  timezone: string;
}

type AppointmentStatusFilter = AppointmentStatus | "all";

interface AppointmentsResponse {
  appointments?: AppointmentAdminRecord[];
  error?: string;
}

function isAppointmentAdminRecord(
  payload: AppointmentAdminRecord | { error?: string },
): payload is AppointmentAdminRecord {
  return "id" in payload && "status" in payload;
}

const statusOptions: Array<{ value: AppointmentStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

function getStatusClasses(status: AppointmentStatus) {
  switch (status) {
    case "completed":
      return "bg-sky-100 text-sky-700";
    case "canceled":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function buildAppointmentsUrl(
  businessId: string,
  filters: { date: string; status: AppointmentStatusFilter },
) {
  const params = new URLSearchParams({ businessId });

  if (filters.date) {
    params.set("date", filters.date);
  }

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  return `/api/appointments?${params.toString()}`;
}

export function AppointmentsPanel({ businessId, timezone }: AppointmentsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [appointments, setAppointments] = useState<AppointmentAdminRecord[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch(
          buildAppointmentsUrl(businessId, {
            date: dateFilter,
            status: statusFilter,
          }),
          { method: "GET" },
        );
        const payload = (await response.json()) as AppointmentsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load appointments");
        }

        if (!cancelled) {
          setAppointments(payload.appointments ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to load appointments");
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [businessId, dateFilter, statusFilter]);

  const handleCancel = (appointmentId: string) => {
    setMessage(null);
    setCancelingId(appointmentId);

    startTransition(async () => {
      try {
        const response = await fetch("/api/appointments", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointmentId,
            status: "canceled",
          }),
        });
        const payload = (await response.json()) as AppointmentAdminRecord | { error?: string };

        if (!response.ok || !isAppointmentAdminRecord(payload)) {
          throw new Error(("error" in payload && payload.error) || "Unable to cancel appointment");
        }

        setAppointments((prev) =>
          prev
            .map((appointment) =>
              appointment.id === appointmentId
                ? {
                    ...appointment,
                    status: payload.status,
                    cancellationReason: payload.cancellationReason,
                    updatedAt: payload.updatedAt,
                  }
                : appointment,
            )
            .filter((appointment) => statusFilter === "all" || appointment.status === statusFilter),
        );
        setMessage("Appointment canceled.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to cancel appointment");
      } finally {
        setCancelingId(null);
      }
    });
  };

  return (
    <section id="appointments" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Appointments</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Appointment management</h2>
          <p className="mt-2 text-sm text-slate-500">
            Review bookings by date or status, then cancel appointments directly from the dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Date
            </span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AppointmentStatusFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Time
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Service
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Customer
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Provider
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Status
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="align-top">
                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-950">
                    {formatDashboardDateTime(appointment.startTime, timezone)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Ref: {appointment.id}</p>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-950">{appointment.serviceName ?? "Unknown service"}</p>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-950">{appointment.customerName ?? "Unknown customer"}</p>
                  <p className="mt-1 text-xs text-slate-500">{appointment.customerEmail ?? "No email"}</p>
                  <p className="mt-1 text-xs text-slate-400">{appointment.customerPhone ?? "No phone"}</p>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                  {appointment.providerName ?? "Unassigned"}
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(
                      appointment.status,
                    )}`}
                  >
                    {appointment.status}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-right text-sm text-slate-700">
                  <button
                    type="button"
                    onClick={() => handleCancel(appointment.id)}
                    disabled={
                      pending || cancelingId === appointment.id || appointment.status !== "scheduled"
                    }
                    className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    {cancelingId === appointment.id ? "Canceling..." : "Cancel"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loaded && appointments.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
          No appointments match the current filters.
        </div>
      ) : null}

      {!loaded ? <p className="mt-4 text-sm text-slate-500">Loading appointments...</p> : null}
    </section>
  );
}
