import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const Client = new ApolloClient({
  link: new HttpLink({ uri: "/query" }),
  cache: new InMemoryCache(),
});

export default Client;
