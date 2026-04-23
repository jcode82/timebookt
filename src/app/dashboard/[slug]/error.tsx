"use client";

import React from "react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Dashboard error</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Unable to load this business dashboard</h1>
        <p className="mt-3 text-sm text-slate-500">
          {error.message || "Something went wrong while loading the dashboard."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Try again
        </button>
      </section>
    </div>
  );
}
