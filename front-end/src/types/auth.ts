import zod from "zod";
import type { Persona } from "./persona";

export type Info = {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
  thumbnail?: string;
};

export type AuthContextType = {
  user: Info | null;
  isAuthenticated: boolean;
  isPersonaSelected: boolean;
  persona: Persona | null;
  revalidatePersona: () => void;
  setUser: (user: Info | null) => void;
  revalidateUser: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  handleLogOut: () => Promise<void>;
};

export const createUserSchema = zod.object({
  email_address: zod.string().email("Invalid email").nonempty("Required"),
  password: zod.string().min(6, "Minimum 6 characters").nonempty("Required"),
  first_name: zod.string().min(2, "Minimum 2 characters").nonempty("Required"),
  last_name: zod.string().min(2, "Minimum 2 characters").nonempty("Required"),
  thumbnail: zod.string().url("Invalid URL").optional(),
});
