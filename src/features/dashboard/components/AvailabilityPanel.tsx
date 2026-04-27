import React from "react";
import type { DashboardData } from "@/features/dashboard/api/getDashboardData";
import { formatAvailabilityDay, formatAvailabilityTimeRange } from "@/features/dashboard/utils/formatters";

interface AvailabilityPanelProps {
  availability: DashboardData["availability"];
}

export function AvailabilityPanel({ availability }: AvailabilityPanelProps) {
  return (
    <section id="availability" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Availability</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">Weekly schedule</h2>
        <p className="mt-1 text-sm text-slate-500">Recurring blocks that control when bookings can land.</p>
      </div>
      <ul className="mt-4 space-y-3">
        {availability.map((block) => (
          <li key={block.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-950">{formatAvailabilityDay(block.dayOfWeek)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatAvailabilityTimeRange(block.startTime, block.endTime)}
                </p>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Capacity {block.capacity}
              </p>
            </div>
          </li>
        ))}
        {availability.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No recurring availability is configured yet.
          </li>
        )}
      </ul>
    </section>
  );
}
