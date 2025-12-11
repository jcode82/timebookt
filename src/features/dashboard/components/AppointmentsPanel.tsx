import type { DashboardData } from "@/features/dashboard/api/getDashboardData";

interface AppointmentsPanelProps {
  appointments: DashboardData["appointments"];
}

export function AppointmentsPanel({ appointments }: AppointmentsPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Upcoming appointments</h2>
        <p className="text-sm text-slate-500">Next {appointments.length}</p>
      </div>
      <ul className="mt-4 space-y-3">
        {appointments.map((appointment) => (
          <li key={appointment.id} className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-medium text-slate-900">{appointment.serviceId}</p>
            <p className="text-xs text-slate-500">
              {new Date(appointment.startTime).toLocaleString()} • Status: {appointment.status}
            </p>
          </li>
        ))}
        {appointments.length === 0 && (
          <li className="text-sm text-slate-500">No appointments scheduled yet.</li>
        )}
      </ul>
    </section>
  );
}
