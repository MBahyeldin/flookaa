import type { Exact, GetChannelQuery, Owner, Scalars } from "@/generated/graphql";
import type { UpdateQueryMapFn } from "@apollo/client";
import { createContext, useContext } from "react";

type ChannelContextType = {
    owner: Owner;
    updateChannelQuery: (mapFn: UpdateQueryMapFn<GetChannelQuery, Exact<{
        id: Scalars["Int32"]["input"];
    }>>) => void
};

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({
    owner,
    updateChannelQuery,
    children
}: {
    owner: Owner;
    updateChannelQuery: (mapFn: UpdateQueryMapFn<GetChannelQuery, Exact<{
        id: Scalars["Int32"]["input"];
    }>>) => void;
    children: React.ReactNode
}) {
    return (
        <ChannelContext.Provider
            value={{
                owner,
                updateChannelQuery,
            }}
        >
            {children}
        </ChannelContext.Provider>
    );
}

export function useChannel() {
    const ctx = useContext(ChannelContext);
    if (!ctx) throw new Error("useChannel must be used inside ChannelProvider");
    return ctx;
}
