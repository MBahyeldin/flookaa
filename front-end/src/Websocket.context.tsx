import { createContext, useContext } from "react";
import type WebSocketService from "./ws";

type WebsocketServiceContextType = {
  websocketService: WebSocketService | null;
};

const WebsocketServiceContext = createContext<
  WebsocketServiceContextType | undefined
>(undefined);

export function WebsocketServiceProvider({
  children,
  websocketService,
}: {
  children: React.ReactNode;
  websocketService: WebSocketService | null;
}) {
  return (
    <WebsocketServiceContext.Provider
      value={{
        websocketService,
      }}
    >
      {children}
    </WebsocketServiceContext.Provider>
  );
}

export function useWebsocketService() {
  const ctx = useContext(WebsocketServiceContext);
  if (!ctx)
    throw new Error(
      "useWebsocketService must be used inside WebsocketService"
    );
  return ctx;
}
