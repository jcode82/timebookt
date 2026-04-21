import { OnboardingIntro } from "@/features/onboarding/components/OnboardingIntro";
import { BusinessOnboardingFlow } from "@/features/onboarding/components/BusinessOnboardingFlow";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { REGION } from "@/lib/env";

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <OnboardingIntro />
      <BusinessOnboardingFlow regionCode={REGION} timezone={DEFAULT_TIMEZONE} />
    </div>
  );
}
