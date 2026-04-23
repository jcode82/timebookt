import React from "react";

interface DashboardSidebarProps {
  businessSlug: string;
  upcomingAppointments: number;
  servicesCount: number;
  availabilityCount: number;
}

const sections = [
  {
    href: "#overview",
    label: "Overview",
    description: "Metrics and booking pace",
  },
  {
    href: "#services",
    label: "Services",
    description: "Catalog and pricing",
  },
  {
    href: "#availability",
    label: "Availability",
    description: "Weekly schedule blocks",
  },
  {
    href: "#appointments",
    label: "Appointments",
    description: "Upcoming bookings",
  },
] as const;

export function DashboardSidebar({
  businessSlug,
  upcomingAppointments,
  servicesCount,
  availabilityCount,
}: DashboardSidebarProps) {
  const countsBySection: Record<string, number | null> = {
    Overview: null,
    Services: servicesCount,
    Availability: availabilityCount,
    Appointments: upcomingAppointments,
  };

  return (
    <nav className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Navigate</p>
      <ul className="mt-3 space-y-2">
        {sections.map((section) => (
          <li key={section.href}>
            <a
              href={section.href}
              className="flex items-center justify-between rounded-2xl px-3 py-3 transition hover:bg-slate-50"
            >
              <span>
                <span className="block text-sm font-medium text-slate-950">{section.label}</span>
                <span className="block text-xs text-slate-500">{section.description}</span>
              </span>
              {typeof countsBySection[section.label] === "number" ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {countsBySection[section.label]}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-slate-100">
        Viewing dashboard for <span className="font-medium">/{businessSlug}</span>
      </p>
    </nav>
  );
}
