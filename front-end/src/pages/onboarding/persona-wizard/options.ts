import { EyeOff, Globe, Lock, type LucideIcon } from "lucide-react";
import { t } from "@/i18n";
import type { Persona } from "@/types/persona";

export type Privacy = Persona["privacy"];

export const PERSONA_TYPES = ["professional", "gaming", "creative", "business", "social"] as const;
export const OTHER_TYPE = "other";
export type PersonaType = (typeof PERSONA_TYPES)[number] | typeof OTHER_TYPE;

export const personaTypeLabel = (type: PersonaType) => t(`personas:types.${type}`);

const PRIVACY_ICONS: Record<Privacy, LucideIcon> = { public: Globe, private: Lock, only_me: EyeOff };

export function privacyOptions(): { value: Privacy; label: string; note: string; icon: LucideIcon }[] {
  return (["public", "private", "only_me"] as const).map((value) => ({
    value,
    label: t(`personas:privacy.${value}.label`),
    note: t(`personas:privacy.${value}.note`),
    icon: PRIVACY_ICONS[value],
  }));
}
