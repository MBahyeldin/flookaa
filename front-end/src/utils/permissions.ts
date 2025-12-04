import type { User } from "@/types/auth";

export function hasRole(user: User | null, role: string): boolean {
  return !!user?.roles.includes(role);
}

export function hasPermission(user: User | null, permission: string): boolean {
  return !!user?.permissions.includes(permission);
}
