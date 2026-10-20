import { apiFetch } from "@/lib/apiFetch";
import type {
  ActiveFollower,
  FollowRequest,
  FollowStatus,
  LockedPersona,
  Persona,
  PersonaProfile,
  PublicPersona,
} from "@/types/persona";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export async function fetchCurrentPersona(): Promise<Persona | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/current`, { credentials: "include" });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Persona;
    return (data);
  } catch (err) {
    console.error("Error fetching current persona:", err);
    return null;
  }
}

export async function fetchUserPersonas(): Promise<Persona[]> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/list`, { credentials: "include" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as Persona[];
    return data.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch (err) {
    console.error("Error fetching personas:", err);
    return [];
  }
}

export async function fetchPersonaProfile(id: string): Promise<PersonaProfile | LockedPersona | "not_found" | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${id}`, { credentials: "include" });
    if (resp.status === 404 || resp.status === 400) return "not_found";
    if (!resp.ok) return null;
    return (await resp.json()) as PersonaProfile | LockedPersona;
  } catch (err) {
    console.error("Error fetching persona:", err);
    return null;
  }
}

export async function fetchConnectedPersonas(id: string): Promise<PublicPersona[] | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${id}/connected`, { credentials: "include" });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { personas: PublicPersona[] };
    return data.personas;
  } catch (err) {
    console.error("Error fetching connected personas:", err);
    return null;
  }
}

/** Follows (active, or pending for a private persona) or unfollows (null). */
export async function setPersonaFollowing(id: number, follow: boolean): Promise<FollowStatus | Error> {
  const action = follow ? "follow" : "unfollow";
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${id}/${action}`, {
      method: "POST",
      credentials: "include",
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return new Error(body.error || `Failed to ${action} persona`);
    return follow ? (body.status as FollowStatus) : null;
  } catch (err) {
    return err as Error;
  }
}

/** Your own persona's followers and requests; throws with the server's message. */
async function followersRequest<T>(personaId: number, path: string, method = "GET"): Promise<T> {
  const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${personaId}/${path}`, {
    method,
    credentials: "include",
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

export async function listFollowRequests(personaId: number): Promise<FollowRequest[]> {
  const body = await followersRequest<{ requests: FollowRequest[] }>(personaId, "requests");
  return body.requests;
}

export async function resolveFollowRequest(
  personaId: number,
  followerId: number,
  decision: "approve" | "reject"
): Promise<void> {
  await followersRequest(personaId, `requests/${followerId}/${decision}`, "POST");
}

export async function listFollowers(personaId: number): Promise<ActiveFollower[]> {
  const body = await followersRequest<{ followers: ActiveFollower[] }>(personaId, "followers");
  return body.followers;
}

export async function removeFollower(personaId: number, followerId: number): Promise<void> {
  await followersRequest(personaId, `followers/${followerId}/remove`, "POST");
}

/** Invites a persona to follow you; "following" when it already does or had asked to. */
export async function invitePersona(id: number): Promise<"invited" | "following" | Error> {
  try {
    const body = await followersRequest<{ status: "invited" | "following" }>(id, "invite", "POST");
    return body.status;
  } catch (err) {
    return err as Error;
  }
}

export async function uninvitePersona(id: number): Promise<void | Error> {
  try {
    await followersRequest(id, "uninvite", "POST");
  } catch (err) {
    return err as Error;
  }
}

/** Your answer to another persona's invitation to follow it. */
export async function respondToInvitation(
  personaId: number,
  inviterId: number,
  decision: "accept" | "reject"
): Promise<void> {
  await followersRequest(personaId, `invitations/${inviterId}/${decision}`, "POST");
}

/** Your private persona's follow-request link token; created once, replaced on reset. */
export async function getInviteLink(personaId: number, reset = false): Promise<string> {
  const body = await followersRequest<{ token: string }>(personaId, reset ? "invite-link/reset" : "invite-link", "POST");
  return body.token;
}

export type InviteState =
  | { visible: true; persona_id: number }
  | { visible: false; follow_status: FollowStatus };

export async function fetchInvite(token: string): Promise<InviteState | "not_found" | "unauthenticated" | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/invite/${encodeURIComponent(token)}`, {
      credentials: "include",
    });
    if (resp.status === 404) return "not_found";
    if (resp.status === 401) return "unauthenticated";
    if (!resp.ok) return null;
    return (await resp.json()) as InviteState;
  } catch (err) {
    console.error("Error fetching invite:", err);
    return null;
  }
}

export async function requestViaInvite(token: string): Promise<FollowStatus | Error> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/invite/${encodeURIComponent(token)}/request`, {
      method: "POST",
      credentials: "include",
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return new Error(body.error || "Failed to request to follow");
    return body.status as FollowStatus;
  } catch (err) {
    return err as Error;
  }
}

export async function setCurrentPersona(personaId: string): Promise<boolean> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/set-current-persona`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ persona_id: personaId }),
    });
    return resp.ok;
  } catch (err) {
    console.error("Error setting current persona:", err);
    return false;
  }
}


export type PersonaSaveResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function savePersona<T>(path: string, body: Record<string, unknown>): Promise<PersonaSaveResult<T>> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: data.error ?? "request_failed" };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

/** Sends only the fields given; the rest keep their stored values. */
export const updatePersona = (personaId: string, changes: Record<string, unknown>) =>
  savePersona<Partial<Persona>>(`update/${personaId}`, changes);

export const createPersona = (fields: Record<string, unknown>) =>
  savePersona<{ persona_id: number }>("create", fields);
