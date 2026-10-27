import type { OnboardingStepDef } from "./context";
import AboutYou from "./steps/AboutYou";
import Channels from "./steps/Channels";
import Communities from "./steps/Communities";
import Interests from "./steps/Interests";
import Personas from "./steps/Personas";

// Keyed by the server's step key; a step ticket adds its entry here and in backend/internal/onboarding.
export const onboardingSteps: Record<string, OnboardingStepDef> = {
  about_you: {
    label: "About you",
    title: "A little about you",
    lead: "Used only to check age limits on channels. Nobody else sees it.",
    Component: AboutYou,
  },
  interests: {
    label: "Interests",
    title: "What are you into?",
    lead: "Pick a few for your default persona. They shape what we suggest.",
    Component: Interests,
  },
  communities: {
    label: "Communities",
    title: "Join your communities",
    lead: "Suggested from your interests. Joining is instant for public ones.",
    Component: Communities,
  },
  channels: {
    label: "Channels",
    title: "Pick some channels",
    lead: "Channels are where the posts happen.",
    Component: Channels,
  },
  personas: {
    label: "Personas",
    title: "Your personas",
    lead: "You start with one. Add another for a different side of you, any time.",
    Component: Personas,
  },
};
