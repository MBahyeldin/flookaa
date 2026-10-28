import { EyeOff, Globe, Lock, type LucideIcon } from "lucide-react";
import type { Persona } from "@/types/persona";

export type Privacy = Persona["privacy"];

export const PERSONA_TYPES = ["Professional", "Gaming", "Creative", "Business", "Social"] as const;
export const OTHER_TYPE = "Other";

export const PRIVACY_OPTIONS: { value: Privacy; label: string; note: string; icon: LucideIcon }[] = [
  {
    value: "public",
    label: "Public",
    note: "Everyone sees this persona and can follow it at once.",
    icon: Globe,
  },
  {
    value: "private",
    label: "Private",
    note: "Others see an anonymous name until you approve them as followers.",
    icon: Lock,
  },
  {
    value: "only_me",
    label: "Only me",
    note: "Only you see it. Nobody can follow it.",
    icon: EyeOff,
  },
];
