import type { Persona } from "@/types/persona";

/** What a privacy change takes away, shown before it's saved. */
export function privacyChangeHint(persona: Persona) {
  return (value: string) => {
    if (value === persona.privacy) return null;
    if (persona.privacy === "public" && persona.show_on_profile) {
      return "It will no longer show on your profile.";
    }
    if (persona.privacy === "private") {
      return "Your follow-request link stops working and your pending invitations are cancelled. Your followers stay.";
    }
    return null;
  };
}
