import React from "react";
import type { DashboardData } from "@/features/dashboard/api/getDashboardData";
import { formatPriceCents } from "@/features/dashboard/utils/formatters";

interface ServicesPanelProps {
  services: DashboardData["services"];
}

export function ServicesPanel({ services }: ServicesPanelProps) {
  return (
    <section id="services" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Services</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">Service catalog</h2>
        <p className="mt-1 text-sm text-slate-500">Current offerings available for customers to book.</p>
      </div>
      <ul className="mt-4 space-y-3">
        {services.map((service) => (
          <li key={service.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-950">{service.name}</p>
                <p className="mt-1 text-xs text-slate-500">{service.durationMinutes} minutes</p>
              </div>
              <p className="text-sm font-medium text-slate-700">{formatPriceCents(service.priceCents, service.currency)}</p>
            </div>
          </li>
        ))}
        {services.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No services are configured yet.
          </li>
        )}
      </ul>
    </section>
  );
}
