import { useState } from "react";
import { toast } from "sonner";
import { applySavedPersona } from "@/lib/applySavedPersona";
import { updatePersona } from "@/services/persona";
import type { Persona } from "@/types/persona";

/** Sends only what differs from the stored persona; returns the error code the section may show itself. */
export function usePersonaUpdate(persona: Persona, handledErrors: string[] = []) {
  const [saving, setSaving] = useState(false);

  const save = async (next: Partial<Persona>): Promise<string | null> => {
    const changes = Object.fromEntries(
      Object.entries(next).filter(([k, v]) => (persona[k as keyof Persona] ?? "") !== v),
    );
    if (Object.keys(changes).length === 0) return null;
    setSaving(true);
    const r = await updatePersona(persona.id, changes);
    setSaving(false);
    if (!r.ok) {
      if (!handledErrors.includes(r.error)) toast.error("Couldn't save the persona. Please try again.");
      return r.error;
    }
    applySavedPersona(r.data);
    toast.success("Persona saved");
    return null;
  };

  return { save, saving };
}
