import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OnboardingAction } from "@/types/onboarding";
import { useOnboardingStep } from "./context";

function errorText(error: string) {
  if (error === "step_incomplete") return "Finish this step to continue.";
  // Another tab moved on: the new state is already in place.
  if (error === "step_mismatch" || error === "onboarding_completed") return null;
  return "Something went wrong. Please try again.";
}

/**
 * onContinue saves the step's data first; returning false keeps the user on
 * the step (e.g. a validation error the step shows itself).
 */
export default function OnboardingFooter({
  left,
  onContinue,
  continueDisabled = false,
  continueLabel = "Continue",
  onMoved,
  hideSkip = false,
}: {
  left?: ReactNode;
  onContinue?: () => Promise<boolean | void>;
  continueDisabled?: boolean;
  continueLabel?: string;
  onMoved?: (action: OnboardingAction) => void;
  hideSkip?: boolean;
}) {
  const { step, index, move } = useOnboardingStep();
  const [busy, setBusy] = useState<OnboardingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: OnboardingAction) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      if (action === "next" && onContinue && (await onContinue()) === false) return;
      const result = await move(action);
      if (!result.ok) setError(errorText(result.error));
      else onMoved?.(action);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="text-sm text-destructive text-right">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="w-full sm:w-auto sm:flex-1 min-w-0 text-sm font-medium text-foreground truncate">{left}</div>
        {index > 0 && (
          <Button variant="ghost" disabled={busy !== null} onClick={() => run("back")}>
            Back
          </Button>
        )}
        {step.skippable && !hideSkip && (
          <Button variant="outline" disabled={busy !== null} onClick={() => run("skip")}>
            Skip now
          </Button>
        )}
        <Button
         
          size="lg"
          disabled={continueDisabled || busy !== null}
          onClick={() => run("next")}
        >
          {busy === "next" ? "Saving…" : continueLabel}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
