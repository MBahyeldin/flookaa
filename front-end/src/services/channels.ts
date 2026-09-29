import { apiFetch } from "@/lib/apiFetch";
import type { Channel, ChannelMember, JoinRequest } from "@/types/channel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export async function getChannels(): Promise<{ channels: Channel[] } | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/`, {
      credentials: "include",
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
}

/**
 * Joining a public channel makes the persona a member ("active"); joining a
 * private one files a request a moderator must approve ("pending").
 */
export type JoinResult =
  | { error: Error; status?: undefined }
  | { error: null; status: "active" | "pending" };

export async function joinChannel(channelId: string): Promise<JoinResult> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/join/${channelId}`, {
      method: "POST",
      credentials: "include",
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok)
      return { error: new Error(body.error || "Failed to join channel") };
    return { error: null, status: body.status === "pending" ? "pending" : "active" };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function leaveChannel(channelId: string): Promise<Error | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/leave/${channelId}`, {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok)
      return new Error((await resp.json()).error || "Failed to leave channel");
    return null;
  } catch (err) {
    return err as Error | null;
  }
}

// Moderation: owner, channel moderators and admins only.

async function moderationRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/${path}`, {
    credentials: "include",
    ...init,
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

export async function listJoinRequests(channelId: string): Promise<JoinRequest[]> {
  const body = await moderationRequest<{ requests: JoinRequest[] }>(`${channelId}/requests`);
  return body.requests;
}

export async function resolveJoinRequest(
  channelId: string,
  personaId: number,
  decision: "approve" | "reject"
): Promise<void> {
  await moderationRequest(`${channelId}/requests/${personaId}/${decision}`, { method: "POST" });
}

export async function listMembers(channelId: string): Promise<ChannelMember[]> {
  const body = await moderationRequest<{ members: ChannelMember[] }>(`${channelId}/members`);
  return body.members;
}

export async function removeMember(channelId: string, personaId: number): Promise<void> {
  await moderationRequest(`${channelId}/members/${personaId}/remove`, { method: "POST" });
}
