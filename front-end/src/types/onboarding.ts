export type OnboardingStepInfo = {
  key: string;
  skippable: boolean;
};

export type OnboardingState = {
  completed: boolean;
  current: string | null;
  steps: OnboardingStepInfo[];
};

export type OnboardingAction = "next" | "skip" | "back";

export type MoveResult =
  | { ok: true; onboarding: OnboardingState }
  | { ok: false; error: string; onboarding?: OnboardingState };
