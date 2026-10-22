import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Persona } from "@/types/persona";

/** Puts an update answer into the persona list and, if it's the current one, the current persona. */
export function applySavedPersona(saved: Partial<Persona>) {
  const { personas, persona: current, setPersona, updatePersonaInStore } = useUserProfileStore.getState();
  const stored = personas.find((p) => String(p.id) === String(saved.id));
  if (stored) updatePersonaInStore({ ...stored, ...saved, id: stored.id });
  if (current && String(current.id) === String(saved.id)) {
    setPersona({ ...current, ...saved, id: current.id });
  }
}
