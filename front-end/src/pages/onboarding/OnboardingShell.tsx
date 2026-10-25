import Header from "@/navbar/header";
import type { MoveResult, OnboardingAction, OnboardingState } from "@/types/onboarding";
import { OnboardingStepContext, type OnboardingStepDef } from "./context";
import OnboardingProgress from "./OnboardingProgress";
import OnboardingFooter from "./OnboardingFooter";
import { onboardingSteps } from "./steps";

function UnavailableStep() {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-center text-muted-foreground">This step isn't available yet.</p>
      <OnboardingFooter />
    </div>
  );
}

export default function OnboardingShell({
  state,
  move,
  registry = onboardingSteps,
}: {
  state: OnboardingState;
  move: (step: string, action: OnboardingAction) => Promise<MoveResult>;
  registry?: Record<string, OnboardingStepDef>;
}) {
  const index = state.steps.findIndex((s) => s.key === state.current);
  if (index < 0) return null;

  const step = state.steps[index];
  const def = registry[step.key];
  const Step = def?.Component ?? UnavailableStep;

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header onlyLogo />
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 flex flex-col gap-8">
        <OnboardingProgress current={index + 1} total={state.steps.length} />
        {def?.title && (
          <h1 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {def.title}
          </h1>
        )}
        <OnboardingStepContext.Provider
          value={{ step, index, total: state.steps.length, move: (action) => move(step.key, action) }}
        >
          <Step key={step.key} />
        </OnboardingStepContext.Provider>
      </div>
    </div>
  );
}
