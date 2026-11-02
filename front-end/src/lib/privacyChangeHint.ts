import { t } from "@/i18n";
import type { Persona } from "@/types/persona";

/** What a privacy change takes away, shown before it's saved. */
export function privacyChangeHint(persona: Persona) {
  return (value: string) => {
    if (value === persona.privacy) return null;
    if (persona.privacy === "public" && persona.show_on_profile) {
      return t("personas:privacy.hintLeavesProfile");
    }
    if (persona.privacy === "private") {
      return t("personas:privacy.hintLeavesPrivate");
    }
    return null;
  };
}
