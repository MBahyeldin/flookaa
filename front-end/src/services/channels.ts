import { apiFetch } from "@/lib/apiFetch";
import type { Result } from "@/services/interests";
import type { Channel, ChannelInterests, ChannelMember, JoinRequest } from "@/types/channel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export async function getChannels(
  filter: { interests?: string[]; communityId?: number; limit?: number } = {},
): Promise<{ channels: Channel[] } | null> {
  try {
    const params = new URLSearchParams();
    for (const slug of filter.interests ?? []) params.append("interest", slug);
    if (filter.communityId) params.set("community_id", String(filter.communityId));
    if (filter.limit) params.set("limit", String(filter.limit));
    const query = params.size ? `?${params}` : "";
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/${query}`, {
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

/** Follows or unfollows; both are no-ops when already in that state. */
export async function setFollowing(channelId: string, following: boolean): Promise<Error | null> {
  try {
    const action = following ? "follow" : "unfollow";
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/${action}/${channelId}`, {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return new Error(body.error || `Failed to ${action} channel`);
    }
    return null;
  } catch (err) {
    return err as Error;
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

export type ChannelInterestsResult = { ok: true; data: ChannelInterests } | { ok: false; error: string };

async function channelInterestsCall(channelId: string, init?: RequestInit): Promise<ChannelInterestsResult> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/${channelId}/interests`, {
      credentials: "include",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body.error ?? "request_failed" };
    return { ok: true, data: body as ChannelInterests };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

export const getChannelInterests = (channelId: string) => channelInterestsCall(channelId);

export const setChannelInterests = (channelId: string, interestIds: number[]) =>
  channelInterestsCall(channelId, { method: "PUT", body: JSON.stringify({ interest_ids: interestIds }) });

export async function setChannelMinAge(
  channelId: string,
  minAge: number,
): Promise<{ ok: true; minAge: number } | { ok: false; error: string }> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/${channelId}/min-age`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ min_age: minAge }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body.error ?? "request_failed" };
    return { ok: true, minAge: body.min_age };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

export type CreateChannelInput = {
  name: string;
  description: string;
  visibility: "public" | "private";
  min_age: number;
  /** "" = the community's. */
  theme: string;
  cover_pattern: string;
  thumbnail: string;
  interest_ids: number[];
  community_id?: number;
};

export async function createChannel(
  input: CreateChannelInput,
): Promise<Result<{ channel: { ID: number }; community_status: "" | "active" | "pending" }>> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/channels/create`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body.error ?? "request_failed" };
    return { ok: true, data: body };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}
