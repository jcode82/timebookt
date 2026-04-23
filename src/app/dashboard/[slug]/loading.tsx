import React from "react";

function LoadingCard() {
  return <div className="h-28 animate-pulse rounded-3xl bg-slate-200/70" />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="h-44 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200/70" />
      </aside>
      <main className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Loading dashboard...</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        </section>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="h-96 animate-pulse rounded-3xl bg-slate-200/70" />
          <div className="space-y-8">
            <div className="h-72 animate-pulse rounded-3xl bg-slate-200/70" />
            <div className="h-72 animate-pulse rounded-3xl bg-slate-200/70" />
          </div>
        </div>
      </main>
    </div>
  );
}
