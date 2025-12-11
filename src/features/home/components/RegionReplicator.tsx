import { Globe2, Layers } from "lucide-react";
import { APP_NAME, REGION_ENV_KEY } from "@/lib/constants";

export function RegionReplicator() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <Layers className="h-6 w-6 text-emerald-500" />
        <h3 className="text-xl font-semibold text-slate-900">
          Replicate {APP_NAME} in any city
        </h3>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Each deployment references the region through the environment variable
        <code className="mx-2 rounded bg-slate-100 px-2 py-1">{REGION_ENV_KEY}</code>
        so you can duplicate Supabase data, update DNS, and immediately serve a
        localized booking portal.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <Globe2 className="h-5 w-5 text-slate-500" />
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
            Example rollout
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>1. Copy Supabase project + schema</li>
            <li>2. Set business region env</li>
            <li>3. Seed templates per locale</li>
            <li>4. Agents onboard first businesses</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Default environment contract
          </p>
          <pre className="mt-3 rounded-2xl bg-slate-950/90 p-4 text-xs text-slate-200">
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_TIMEBOOKT_REGION=nyc
          </pre>
        </div>
      </div>
    </section>
  );
}
