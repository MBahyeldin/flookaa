import type { Info } from "@/types/auth";

export function hasRole(user: Info | null, role: string): boolean {
  return !!user?.roles.includes(role);
}

export function hasPermission(user: Info | null, permission: string): boolean {
  return !!user?.permissions.includes(permission);
}
