import { createContext, useContext, type ComponentType } from "react";
import type { MoveResult, OnboardingAction, OnboardingStepInfo } from "@/types/onboarding";

export type OnboardingStepDef = {
  label: string;
  title: string;
  lead?: string;
  Component: ComponentType;
};

export type OnboardingStepContextValue = {
  step: OnboardingStepInfo;
  index: number;
  total: number;
  move: (action: OnboardingAction) => Promise<MoveResult>;
};

export const OnboardingStepContext = createContext<OnboardingStepContextValue | null>(null);

export function useOnboardingStep() {
  const ctx = useContext(OnboardingStepContext);
  if (!ctx) throw new Error("useOnboardingStep must be used inside OnboardingShell");
  return ctx;
}
