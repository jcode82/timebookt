import React from "react";
import type { DashboardData } from "@/features/dashboard/api/getDashboardData";

interface MetricsGridProps {
  metrics: DashboardData["metrics"];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const items = [
    {
      label: "Total bookings",
      value: metrics.totalAppointments,
    },
    {
      label: "Today",
      value: metrics.bookingsToday,
    },
    {
      label: "This week",
      value: metrics.bookingsThisWeek,
    },
    {
      label: "Upcoming",
      value: metrics.upcomingAppointments,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
