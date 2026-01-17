import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useAppStore, type AppState } from "./AppStore";
import type { Persona } from "@/types/persona";
import type { Info } from "@/types/auth";

export interface UserProfileState extends AppState {
  user: Info | null;
  persona: Persona | null;
  personas: Persona[];
  setUser: (user: Info | null) => void;
  setPersona: (persona: Persona | null) => void;
  setPersonas: (personas: Persona[]) => void;
  updatePersonaInStore: (updatedPersona: Persona) => void;
}

export const useUserProfileStore = create(
  immer<UserProfileState>((set) => ({
    ...useAppStore.getState(), // Inherit from AppStore

    user: null,

    setUser: (user) =>
      set((s) => {
        s.user = user;
      }),

    persona: null,

    setPersona: (persona) =>
      set((s) => {
        s.persona = persona;
      }),
    personas: [],

    setPersonas: (personas) =>
      set((s) => {
        s.personas = personas;
      }),

    updatePersonaInStore: (updatedPersona) =>
      set((s) => {
        const index = s.personas.findIndex(
          (p) => p.id === updatedPersona.id
        );
        if (index !== -1) {
          s.personas[index] = updatedPersona;
        }
      }),
  }))
);

export const useIsUserLoggedIn = () =>
  useUserProfileStore((s) => s.user !== null);
