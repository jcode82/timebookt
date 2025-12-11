export function OnboardingIntro() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">
        Multi-tenant onboarding ready for AI operators
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        Each submission provisions a business row, persists configuration in Supabase,
        and triggers agent hooks so automation can begin syncing services,
        templates, and availability data.
      </p>
    </section>
  );
}
