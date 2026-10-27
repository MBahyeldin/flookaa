import { Eye, Globe, Lock, type LucideIcon } from "lucide-react";
import type { Persona } from "@/types/persona";

export type Privacy = Persona["privacy"];

export const PERSONA_TYPES = ["Professional", "Gaming", "Creative", "Business", "Social"] as const;
export const OTHER_TYPE = "Other";

export const PRIVACY_OPTIONS: { value: Privacy; label: string; note: string; icon: LucideIcon }[] = [
  {
    value: "public",
    label: "Public",
    note: "Anyone can view this persona",
    icon: Globe,
  },
  {
    value: "private",
    label: "Private",
    note: "Only people you share with can view",
    icon: Lock,
  },
  {
    value: "only_me",
    label: "Only me",
    note: "Just for yourself, completely private",
    icon: Eye,
  },
];
