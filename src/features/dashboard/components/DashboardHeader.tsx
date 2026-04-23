import React from "react";

interface DashboardHeaderProps {
  businessName: string;
  slug: string;
  timezone: string;
}

export function DashboardHeader({ businessName, slug, timezone }: DashboardHeaderProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Admin dashboard</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">{businessName}</h1>
      <div className="mt-4 space-y-1 text-sm text-slate-500">
        <p>/{slug}</p>
        <p>{timezone}</p>
      </div>
    </header>
  );
}
