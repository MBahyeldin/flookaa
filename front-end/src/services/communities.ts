import { apiFetch } from "@/lib/apiFetch";
import type {
  ChannelCommunityState,
  Community,
  CommunityChannelRequest,
  CommunityJoinRequest,
  CommunityMember,
  ModeratedChannel,
  MyCommunity,
  ShowcaseCommunity,
} from "@/types/community";
import type { Result } from "@/services/interests";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function call<T>(path: string, method = "GET", base = "/communities", payload?: unknown): Promise<Result<T>> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1${base}${path}`, {
      method,
      credentials: "include",
      ...(payload !== undefined && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body.error ?? "request_failed" };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

export const getShowcase = () => call<{ communities: ShowcaseCommunity[] }>("/showcase", "GET", "");

export const listCommunities = (interests: string[] = []) => {
  const params = new URLSearchParams(interests.map((slug) => ["interest", slug]));
  return call<{ communities: Community[] }>(`/${params.size ? `?${params}` : ""}`);
};

export const listMyCommunities = () => call<{ communities: MyCommunity[] }>("/mine");

export type CreateCommunityInput = {
  name: string;
  slug: string;
  description: string;
  rules: string;
  visibility: "public" | "private";
  min_age: number;
  theme: string;
  cover_pattern: string;
  thumbnail: string;
  interest_ids: number[];
};

export const createCommunity = (input: CreateCommunityInput) =>
  call<{ community: Community }>("/create", "POST", "/communities", input);

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

export const appointCommunityModerator = (id: number, personaId: number) =>
  call<{ is_moderator: boolean }>(`/${id}/moderators/${personaId}`, "POST");

export const removeCommunityModerator = (id: number, personaId: number) =>
  call<{ is_moderator: boolean }>(`/${id}/moderators/${personaId}/remove`, "POST");

export const listCommunityRequests = (id: number) => call<{ requests: CommunityJoinRequest[] }>(`/${id}/requests`);

export const resolveCommunityRequest = (id: number, personaId: number, decision: "approve" | "reject") =>
  call<{ status: string }>(`/${id}/requests/${personaId}/${decision}`, "POST");

export const requestChannelJoin = (id: number, channelId: number) =>
  call<{ status: "pending" }>(`/${id}/channels/${channelId}/request`, "POST");

export const cancelChannelRequest = (id: number, channelId: number) =>
  call<{ status: "none" }>(`/${id}/channels/${channelId}/cancel`, "POST");

export const removeCommunityChannel = (id: number, channelId: number) =>
  call<{ status: "none" }>(`/${id}/channels/${channelId}/remove`, "POST");

export const listChannelRequests = (id: number) =>
  call<{ requests: CommunityChannelRequest[] }>(`/${id}/channel-requests`);

export const resolveChannelRequest = (id: number, channelId: number, decision: "approve" | "reject") =>
  call<{ status: string }>(`/${id}/channel-requests/${channelId}/${decision}`, "POST");

export const listModeratedChannels = () => call<{ channels: ModeratedChannel[] }>("/moderated", "GET", "/channels");

export const getChannelCommunity = (channelId: number | string) =>
  call<ChannelCommunityState>(`/${channelId}/community`, "GET", "/channels");
