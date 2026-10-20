import type { OnboardingStepDef } from "./context";
import AboutYou from "./steps/AboutYou";
import Channels from "./steps/Channels";
import Communities from "./steps/Communities";
import Interests from "./steps/Interests";
import Personas from "./steps/Personas";

// Keyed by the server's step key; a step ticket adds its entry here and in backend/internal/onboarding.
export const onboardingSteps: Record<string, OnboardingStepDef> = {
  about_you: { title: "Enter your date of birth", Component: AboutYou },
  interests: { title: "What are your main interests?", Component: Interests },
  communities: { title: "Join your communities", Component: Communities },
  channels: { title: "Find your channels", Component: Channels },
  personas: { title: "Create Multiple Personas!", Component: Personas },
};
