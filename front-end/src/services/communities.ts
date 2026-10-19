import { apiFetch } from "@/lib/apiFetch";
import type { Community } from "@/types/community";
import type { Result } from "@/services/interests";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function call<T>(path: string): Promise<Result<T>> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/communities${path}`, { credentials: "include" });
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
