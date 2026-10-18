import { useState } from "react";
import { Input } from "@/components/ui/input";
import OnboardingShell from "@/pages/onboarding/OnboardingShell";
import OnboardingFooter from "@/pages/onboarding/OnboardingFooter";
import type { OnboardingStepDef } from "@/pages/onboarding/context";
import type { MoveResult, OnboardingAction, OnboardingState } from "@/types/onboarding";

function RequiredDemo() {
  const [value, setValue] = useState("");
  return (
    <div className="mx-auto w-full max-w-md flex flex-col gap-8">
      <Input placeholder="Type anything to continue" value={value} onChange={(e) => setValue(e.target.value)} />
      <OnboardingFooter continueDisabled={!value.trim()} />
    </div>
  );
}

function OptionalDemo() {
  const [picked, setPicked] = useState(0);
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPicked((p) => (p === n ? 0 : n))}
            className={`rounded-xl border p-6 text-left ${picked === n ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"}`}
          >
            Card {n}
          </button>
        ))}
      </div>
      <OnboardingFooter left={`${picked ? 1 : 0} selected`} />
    </div>
  );
}

const registry: Record<string, OnboardingStepDef> = {
  demo_required: { title: "A Required Step", Component: RequiredDemo },
  demo_optional: { title: "Join Your Communities", Component: OptionalDemo },
};

const steps = [
  { key: "demo_required", skippable: false },
  { key: "demo_optional", skippable: true },
  { key: "demo_unregistered", skippable: true },
];

/** Dev-only preview of the onboarding frame with fake steps and local state. */
export default function DevOnboardingPage() {
  const [index, setIndex] = useState(0);
  const state: OnboardingState = {
    completed: index >= steps.length,
    current: steps[index]?.key ?? null,
    steps,
  };

  const move = async (key: string, action: OnboardingAction): Promise<MoveResult> => {
    await new Promise((r) => setTimeout(r, 300));
    const step = steps[index];
    if (step?.key !== key) return { ok: false, error: "step_mismatch", onboarding: state };
    if (action === "skip" && !step.skippable) return { ok: false, error: "step_required", onboarding: state };
    const next = action === "back" ? index - 1 : index + 1;
    setIndex(next);
    return { ok: true, onboarding: { ...state, current: steps[next]?.key ?? null, completed: next >= steps.length } };
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-auto bg-background">
      {state.completed ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Onboarding complete.</p>
          <button type="button" className="underline text-primary" onClick={() => setIndex(0)}>
            Start again
          </button>
        </div>
      ) : (
        <OnboardingShell state={state} move={move} registry={registry} />
      )}
    </div>
  );
}
