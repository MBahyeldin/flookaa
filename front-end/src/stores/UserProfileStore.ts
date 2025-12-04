import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useAppStore, type AppState } from "./AppStore";

export interface UserProfileState extends AppState {
  profileId: string | null;
  setProfileId: (id: string) => void;
}

export const useUserProfileStore = create(
  immer<UserProfileState>((set) => ({
    ...useAppStore.getState(), // Inherit from AppStore

    profileId: null,

    setProfileId: (id) =>
      set((s) => {
        s.profileId = id;
      }),
  }))
);