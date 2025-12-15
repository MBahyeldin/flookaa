import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

const Client = new ApolloClient({
  link: new HttpLink({ uri: `${API_BASE_URL}/query`, credentials: "include" }),
  cache: new InMemoryCache(),
});

export default Client;
