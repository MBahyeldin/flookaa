import { apiFetch } from "@/lib/apiFetch";
import type { Community, CommunityJoinRequest, CommunityMember } from "@/types/community";
import type { Result } from "@/services/interests";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function call<T>(path: string, method = "GET"): Promise<Result<T>> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/communities${path}`, { method, credentials: "include" });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body.error ?? "request_failed" };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

export const listCommunities = (interest?: string) =>
  call<{ communities: Community[] }>(`/${interest ? `?interest=${encodeURIComponent(interest)}` : ""}`);

export const getCommunityBySlug = (slug: string) =>
  call<{ community: Community }>(`/by-slug/${encodeURIComponent(slug)}`);

export const getCommunity = (id: number) => call<{ community: Community }>(`/${id}`);

export const joinCommunity = (id: number) => call<{ status: "active" | "pending" }>(`/${id}/join`, "POST");

export const leaveCommunity = (id: number) => call<{ status: "none" }>(`/${id}/leave`, "POST");

export const followCommunity = (id: number) => call<{ following: boolean }>(`/${id}/follow`, "POST");

export const unfollowCommunity = (id: number) => call<{ following: boolean }>(`/${id}/unfollow`, "POST");

export const listCommunityMembers = (id: number, limit = 100, offset = 0) =>
  call<{ members: CommunityMember[] }>(`/${id}/members?limit=${limit}&offset=${offset}`);

export const removeCommunityMember = (id: number, personaId: number) =>
  call<{ message: string }>(`/${id}/members/${personaId}/remove`, "POST");

export const listCommunityRequests = (id: number) => call<{ requests: CommunityJoinRequest[] }>(`/${id}/requests`);

export const resolveCommunityRequest = (id: number, personaId: number, decision: "approve" | "reject") =>
  call<{ status: string }>(`/${id}/requests/${personaId}/${decision}`, "POST");
