import { useUserProfileStore } from "@/stores/UserProfileStore";

/**
 * The backend rejects requests per route tier:
 * - 401: no valid session.
 * - 403 `{ error: "persona_required" }`: signed in, but no persona chosen.
 *
 * Clearing the store is enough to recover: App renders the public layout when
 * there is no user, and DashboardLayout renders persona selection when there
 * is no persona. No redirect, so no redirect loops.
 */
export const PERSONA_REQUIRED = "persona_required";

export function handleAuthFailure(status: number, errorCode?: string) {
  const { setUser, setPersona } = useUserProfileStore.getState();
  if (status === 401) {
    setUser(null);
    setPersona(null);
  } else if (status === 403 && errorCode === PERSONA_REQUIRED) {
    setPersona(null);
  }
}

/** fetch for backend API calls: always sends cookies and applies the auth rules above. */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const resp = await fetch(input, { credentials: "include", ...init });

  if (resp.status === 401) {
    handleAuthFailure(401);
  } else if (resp.status === 403) {
    let errorCode: string | undefined;
    try {
      errorCode = (await resp.clone().json())?.error;
    } catch {
      /* non-JSON 403 */
    }
    handleAuthFailure(403, errorCode);
  }

  return resp;
}
