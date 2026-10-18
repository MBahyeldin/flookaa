import type { OnboardingStepDef } from "./context";
import AboutYou from "./steps/AboutYou";

// Keyed by the server's step key; a step ticket adds its entry here and in backend/internal/onboarding.
export const onboardingSteps: Record<string, OnboardingStepDef> = {
  about_you: { title: "Enter your date of birth", Component: AboutYou },
};
