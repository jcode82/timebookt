import type { DashboardData } from "@/features/dashboard/api/getDashboardData";

interface MetricsGridProps {
  metrics: DashboardData["metrics"];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const items = [
    {
      label: "Total appointments",
      value: metrics.totalAppointments,
    },
    {
      label: "Upcoming",
      value: metrics.upcomingAppointments,
    },
    {
      label: "Active customers",
      value: metrics.activeCustomers,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="text-3xl font-semibold text-slate-900">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
