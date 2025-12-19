import WaitlistForm from "@/components/WaitlistForm";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-2xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">TimeBookt</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Private beta now boarding
        </h1>
        <p className="mt-3 text-base text-slate-300">
          We&apos;re finalizing the multi-tenant control center before opening the
          self-serve product. Join the priority list and we&apos;ll reach out as soon
          as your region is live.
        </p>
        <div className="mt-8 flex flex-col items-center">
          <WaitlistForm />
        </div>
        <div className="mt-6 space-y-1 text-xs text-slate-400">
          <p>Already have access? Contact your onboarding partner for credentials.</p>
          <p>© {new Date().getFullYear()} TimeBookt. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
