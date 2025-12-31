import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useAppStore, type AppState } from "./AppStore";
import type { Persona } from "@/types/persona";

export interface UserProfileState extends AppState {
  profileId: string | null;
  personaId: string | null;
  personas: Persona[];
  setProfileId: (id: string) => void;
  setPersonaId: (id: string) => void;
  setPersonas: (personas: Persona[]) => void;
}

export const useUserProfileStore = create(
  immer<UserProfileState>((set) => ({
    ...useAppStore.getState(), // Inherit from AppStore

    profileId: null,
    personaId: null,

    setPersonaId: (id) =>
      set((s) => {
        s.personaId = id;
      }),

    setProfileId: (id) =>
      set((s) => {
        s.profileId = id;
      }),

    personas: [],

    setPersonas: (personas) =>
      set((s) => {
        s.personas = personas;
      }),
  }))
);

export const useIsUserLoggedIn = () =>
  useUserProfileStore((s) => s.profileId !== null);
