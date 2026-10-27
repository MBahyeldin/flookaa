import { useState } from "react";
import { useAuth } from "@/Auth.context";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { MoveResult, OnboardingAction, OnboardingState } from "@/types/onboarding";
import { OnboardingStepContext, type OnboardingStepDef } from "./context";
import OnboardingProgress from "./OnboardingProgress";
import OnboardingFooter from "./OnboardingFooter";
import { onboardingSteps } from "./steps";

function UnavailableStep() {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-muted-foreground">This step isn't available yet.</p>
      <OnboardingFooter />
    </div>
  );
}

export default function OnboardingShell({
  state,
  move,
  registry = onboardingSteps,
  onExit,
}: {
  state: OnboardingState;
  move: (step: string, action: OnboardingAction) => Promise<MoveResult>;
  registry?: Record<string, OnboardingStepDef>;
  onExit?: () => void | Promise<void>;
}) {
  const { handleLogOut } = useAuth();
  const [exiting, setExiting] = useState(false);
  const index = state.steps.findIndex((s) => s.key === state.current);
  if (index < 0) return null;

  const step = state.steps[index];
  const def = registry[step.key];
  const Step = def?.Component ?? UnavailableStep;

  // Every step saves through its own endpoint, so exiting only logs out; the next login resumes here.
  const exit = async () => {
    setExiting(true);
    try {
      await (onExit ?? handleLogOut)();
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-12">
      <header className="flex items-center gap-4 px-4 py-4 md:px-8">
        <Brand className="flex-1" />
        <Button variant="ghost" loading={exiting} onClick={exit}>
          Save and exit
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-[540px] flex-col gap-6 px-4 pt-6 md:px-0 md:pt-10">
        <OnboardingProgress current={index + 1} total={state.steps.length} label={def?.label} />
        {def && (
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 font-semibold text-foreground">{def.title}</h1>
            {def.lead && <p className="text-muted-foreground">{def.lead}</p>}
          </div>
        )}
        <OnboardingStepContext.Provider
          value={{ step, index, total: state.steps.length, move: (action) => move(step.key, action) }}
        >
          <Step key={step.key} />
        </OnboardingStepContext.Provider>
      </main>
    </div>
  );
}
