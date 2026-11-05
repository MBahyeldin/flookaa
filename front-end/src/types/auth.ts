import type { OnboardingState } from "@/types/onboarding";
import type { Gender, Language } from "@/i18n";

export type Info = {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
  thumbnail?: string;
  is_admin?: boolean;
  language: Language | null;
  gender: Gender | null;
  onboarding: OnboardingState;
};

export type AuthContextType = {
  user: Info | null;
  isAuthenticated: boolean;
  revalidateUser: () => void;
  revalidatePersona: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  handleLogOut: () => Promise<void>;
};
