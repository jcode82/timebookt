const steps = [
  "Define business + region metadata",
  "Upload services & staff rosters",
  "Seed templates for locale",
  "Invite AI agents + admins",
];

export function OnboardingSteps() {
  return (
    <ol className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-sm text-emerald-900">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold">
            {index + 1}
          </span>
          <span className="flex-1 self-center">{step}</span>
        </li>
      ))}
    </ol>
  );
}
