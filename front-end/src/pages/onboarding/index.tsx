import { useEffect, useRef, useState } from "react";
import AppLoader from "@/components/app-loader";
import { Button } from "@/components/ui/button";
import { moveOnboarding } from "@/services/onboarding";
import { setCurrentPersona } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import OnboardingShell from "./OnboardingShell";

const PERSONA_ATTEMPT_KEY = "onboarding_persona_attempt";

function takeAttempt() {
  try {
    const tried = sessionStorage.getItem(PERSONA_ATTEMPT_KEY) === "1";
    sessionStorage.setItem(PERSONA_ATTEMPT_KEY, tried ? "" : "1");
    return !tried;
  } catch {
    return true;
  }
}

function clearAttempt() {
  try {
    sessionStorage.removeItem(PERSONA_ATTEMPT_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Onboarding runs as the default persona, so the persona steps can use Persona-tier endpoints. */
export default function OnboardingPage() {
  const { user, persona, personas } = useUserProfileStore();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const defaultPersona = personas.find((p) => p.is_default) ?? personas[0];

  useEffect(() => {
    if (persona) {
      clearAttempt();
      return;
    }
    if (started.current) return;
    started.current = true;
    // One reload per session, so a persona that never sticks can't loop.
    if (!defaultPersona || !takeAttempt()) {
      setFailed(true);
      return;
    }
    setCurrentPersona(defaultPersona.id).then((ok) => {
      // Reload like persona selection: the websocket subscribes on load only.
      if (ok) window.location.reload();
      else setFailed(true);
    });
  }, [persona, defaultPersona]);

  if (!user?.onboarding) return null;

  if (!persona) {
    if (!failed) return <AppLoader />;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">We couldn't open your persona.</p>
        <Button
         
          onClick={() => {
            clearAttempt();
            window.location.reload();
          }}
        >
          Try again
        </Button>
      </main>
    );
  }

  return <OnboardingShell state={user.onboarding} move={moveOnboarding} />;
}
