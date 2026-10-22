import { apiFetch } from "@/lib/apiFetch";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { MoveResult, OnboardingAction, OnboardingState } from "@/types/onboarding";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Moves the current onboarding step; any state the server returns (409s included) replaces the stored one. */
export async function moveOnboarding(step: string, action: OnboardingAction): Promise<MoveResult> {
  let data: { error?: string; onboarding?: OnboardingState } = {};
  let ok = false;
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/users/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, action }),
    });
    ok = resp.ok;
    data = await resp.json().catch(() => ({}));
  } catch (err) {
    console.error("Failed to move onboarding:", err);
  }

  if (data.onboarding) {
    const { user, setUser } = useUserProfileStore.getState();
    if (user) setUser({ ...user, onboarding: data.onboarding });
  }
  if (ok && data.onboarding) return { ok: true, onboarding: data.onboarding };
  return { ok: false, error: data.error ?? "onboarding_failed", onboarding: data.onboarding };
}
