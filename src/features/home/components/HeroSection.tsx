import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import type { HeroMetricsResult } from "@/features/home/api/getHeroMetrics";

interface HeroSectionProps {
  metrics: HeroMetricsResult;
}

export function HeroSection({ metrics }: HeroSectionProps) {
  return (
    <section className="relative flex flex-col gap-6 rounded-3xl bg-slate-900 px-8 py-16 text-white shadow-2xl">
      <p className="text-sm uppercase tracking-widest text-slate-400">
        Operating region: {metrics.region}
      </p>
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          {APP_NAME} orchestrates bookings across cities with AI-ready rails.
        </h1>
        <p className="text-lg text-slate-200 md:text-xl">
          Launch a new market in minutes—connect Supabase, invite agents, and
          let services, staff, and customers sync in real-time.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/onboarding"
          className="rounded-full bg-emerald-400 px-6 py-3 text-center text-slate-900 transition hover:bg-emerald-300"
        >
          Start business onboarding
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-white/30 px-6 py-3 text-center text-white transition hover:border-white/60"
        >
          View admin console
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-6 pt-6 text-left md:grid-cols-4">
        <div>
          <dt className="text-sm text-slate-400">Businesses live</dt>
          <dd className="text-3xl font-semibold">{metrics.businessCount}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-400">AI hooks shipped</dt>
          <dd className="text-3xl font-semibold">4</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-400">Regional replicas</dt>
          <dd className="text-3xl font-semibold">12</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-400">Automation ready</dt>
          <dd className="text-3xl font-semibold">100%</dd>
        </div>
      </dl>
    </section>
  );
}
