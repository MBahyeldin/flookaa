import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useAppStore, type AppState } from "./AppStore";

export interface UserProfileState extends AppState {
  profileId: string | null;
  personaId: string | null;
  setProfileId: (id: string) => void;
  setPersonaId: (id: string) => void;
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
  }))
);

export const useIsUserLoggedIn = () =>
  useUserProfileStore((s) => s.profileId !== null);
