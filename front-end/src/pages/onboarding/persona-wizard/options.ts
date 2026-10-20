import { Eye, Globe, Lock, type LucideIcon } from "lucide-react";
import type { Persona } from "@/types/persona";

export type Privacy = Persona["privacy"];

export const PERSONA_TYPES = ["Professional", "Gaming", "Creative", "Business", "Social"] as const;
export const OTHER_TYPE = "Other";

export const PRIVACY_OPTIONS: { value: Privacy; label: string; note: string; icon: LucideIcon; tone: string }[] = [
  {
    value: "public",
    label: "Public",
    note: "Anyone can view this persona",
    icon: Globe,
    tone: "border-success/40 bg-success/10 text-success",
  },
  {
    value: "private",
    label: "Private",
    note: "Only people you share with can view",
    icon: Lock,
    tone: "border-warning/40 bg-warning/10 text-warning",
  },
  {
    value: "only_me",
    label: "Only me",
    note: "Just for yourself, completely private",
    icon: Eye,
    tone: "border-primary/40 bg-primary/10 text-primary",
  },
];
