import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./Auth.context";
import { ApolloProvider } from "@apollo/client/react";
import client from "./graphql/client";
import WebSocketService from "./ws";
import { WebsocketServiceProvider } from "./Websocket.context";
import { ThemeProvider } from "./Theme.context";
import { LoadingProvider } from "./Loading.context";

const wsService = WebSocketService.getInstance();


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LoadingProvider>
        <AuthProvider>
          <ThemeProvider>
          <WebsocketServiceProvider websocketService={wsService}>
            <ApolloProvider client={client}>
              <App />
            </ApolloProvider>
          </WebsocketServiceProvider>
          </ThemeProvider>
        </AuthProvider>
      </LoadingProvider>
    </BrowserRouter>
  </StrictMode>
);
