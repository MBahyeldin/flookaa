import { createContext, useContext } from "react";
import BlockObjectsProviderType from "./components/portable-text/blockObjects/BlockObjectsProvider";

type BlockObjectsProviderContextType = {
  blockObjectsProvider: BlockObjectsProviderType | null;
};

const BlockObjectsProviderContext = createContext<
  BlockObjectsProviderContextType | undefined
>(undefined);

export function BlockObjectsProviderProvider({
  children,
  blockObjectsProvider,
}: {
  children: React.ReactNode;
  blockObjectsProvider: BlockObjectsProviderType | null;
}) {
  return (
    <BlockObjectsProviderContext.Provider
      value={{
        blockObjectsProvider,
      }}
    >
      {children}
    </BlockObjectsProviderContext.Provider>
  );
}

export function useBlockObjectsProvider() {
  const ctx = useContext(BlockObjectsProviderContext);
  if (!ctx)
    throw new Error(
      "useBlockObjectsProvider must be used inside BlockObjectsProvider"
    );
  return ctx;
}
