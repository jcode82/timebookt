import { OnboardingIntro } from "@/features/onboarding/components/OnboardingIntro";
import { BusinessSignupForm } from "@/features/onboarding/components/BusinessSignupForm";
import { OnboardingSteps } from "@/features/onboarding/components/OnboardingSteps";

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <OnboardingIntro />
      <BusinessSignupForm />
      <OnboardingSteps />
    </div>
  );
}
