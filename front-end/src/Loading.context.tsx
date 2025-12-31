import React, { createContext, useContext } from "react";

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingContextType {
  isFetchUserLoading: boolean;
  setIsFetchUserLoading: (loading: boolean) => void;
  isFetchCurrentPersonaLoading: boolean;
  setIsFetchCurrentPersonaLoading: (loading: boolean) => void;
  isFetchAllPersonasLoading: boolean;
  setIsFetchAllPersonasLoading: (loading: boolean) => void;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isFetchUserLoading, setIsFetchUserLoading] = React.useState(true);
  const [isFetchCurrentPersonaLoading, setIsFetchCurrentPersonaLoading] =
    React.useState(true);
  const [isFetchAllPersonasLoading, setIsFetchAllPersonasLoading] =
    React.useState(true);

  return (
    <LoadingContext.Provider
      value={{
        isFetchUserLoading,
        setIsFetchUserLoading,
        isFetchCurrentPersonaLoading,
        setIsFetchCurrentPersonaLoading,
        isFetchAllPersonasLoading,
        setIsFetchAllPersonasLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used inside LoadingProvider");
  return ctx;
}
