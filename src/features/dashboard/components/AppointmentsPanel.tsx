import React from "react";
import type { DashboardData } from "@/features/dashboard/api/getDashboardData";
import { formatDashboardDateTime } from "@/features/dashboard/utils/formatters";

interface AppointmentsPanelProps {
  appointments: DashboardData["appointments"];
  services: DashboardData["services"];
  timezone: string;
}

export function AppointmentsPanel({ appointments, services, timezone }: AppointmentsPanelProps) {
  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));

  return (
    <section id="appointments" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Appointments</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Upcoming appointments</h2>
        </div>
        <p className="text-sm text-slate-500">Next {appointments.length}</p>
      </div>
      <ul className="mt-4 space-y-3">
        {appointments.map((appointment) => (
          <li key={appointment.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-950">
                  {serviceNameById.get(appointment.serviceId) ?? appointment.serviceId}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDashboardDateTime(appointment.startTime, timezone)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                {appointment.status}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">Appointment ID: {appointment.id}</p>
          </li>
        ))}
        {appointments.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No upcoming appointments scheduled yet.
          </li>
        )}
      </ul>
    </section>
  );
}
