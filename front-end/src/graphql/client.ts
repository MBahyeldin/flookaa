import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { ServerError } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { handleAuthFailure } from "@/lib/apiFetch";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

// /query sits behind RequirePersona, so auth failures arrive as HTTP 401/403
// before GraphQL runs. Apply the same rules as REST calls (see apiFetch).
const authErrorLink = new ErrorLink(({ error }) => {
  if (!ServerError.is(error)) return;
  let errorCode: string | undefined;
  try {
    errorCode = JSON.parse(error.bodyText)?.error;
  } catch {
    /* non-JSON body */
  }
  handleAuthFailure(error.statusCode, errorCode);
});

const Client = new ApolloClient({
  link: ApolloLink.from([
    authErrorLink,
    new HttpLink({ uri: `${API_BASE_URL}/query`, credentials: "include" }),
  ]),
  cache: new InMemoryCache(),
});

export default Client;
