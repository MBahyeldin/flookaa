import type { Persona } from "@/types/persona";

export function personaInitials(p: Pick<Persona, "first_name" | "last_name">) {
  return `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase();
}
