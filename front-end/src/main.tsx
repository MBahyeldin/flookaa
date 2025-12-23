import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./Auth.context";
import { ApolloProvider } from "@apollo/client/react";
import client from "./graphql/client";
import { BlockObjectsProviderProvider } from "./BlockObjectsProvider.context";
import BlockObjectsProvider from "./components/portable-text/blockObjects/BlockObjectsProvider";
import WebSocketService from "./ws";
import { WebsocketServiceProvider } from "./Websocket.context";
import { ThemeProvider } from "./Theme.context";

const blockObjectsProvider = new BlockObjectsProvider();
blockObjectsProvider.registerAll();
const wsService = WebSocketService.getInstance();


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
        <WebsocketServiceProvider websocketService={wsService}>
          <ApolloProvider client={client}>
            <BlockObjectsProviderProvider
              blockObjectsProvider={blockObjectsProvider}
            >
              <App />
            </BlockObjectsProviderProvider>
          </ApolloProvider>
        </WebsocketServiceProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
