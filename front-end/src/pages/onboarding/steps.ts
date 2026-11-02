import { t } from "@/i18n";
import type { OnboardingStepDef } from "./context";
import AboutYou from "./steps/AboutYou";
import Channels from "./steps/Channels";
import Communities from "./steps/Communities";
import Interests from "./steps/Interests";
import Personas from "./steps/Personas";

// Keyed by the server's step key; a step ticket adds its entry here and in backend/internal/onboarding.
export const onboardingSteps: Record<string, OnboardingStepDef> = {
  about_you: step("about_you", AboutYou),
  interests: step("interests", Interests),
  communities: step("communities", Communities),
  channels: step("channels", Channels),
  personas: step("personas", Personas),
};

type StepKey = "about_you" | "interests" | "communities" | "channels" | "personas";

function step(key: StepKey, Component: OnboardingStepDef["Component"]): OnboardingStepDef {
  return {
    get label() {
      return t(`onboarding:steps.${key}.label`);
    },
    get title() {
      return t(`onboarding:steps.${key}.title`);
    },
    get lead() {
      return t(`onboarding:steps.${key}.lead`);
    },
    Component,
  };
}
