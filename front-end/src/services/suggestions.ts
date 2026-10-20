import { apiFetch } from "@/lib/apiFetch";
import type { Channel } from "@/types/channel";
import type { Community } from "@/types/community";
import type { Result } from "@/services/interests";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** "community": from a community the persona joined or follows; "interest": shares an interest. */
export type SuggestedChannel = Channel & { source: "community" | "interest" };

type Page = { limit?: number; offset?: number };

async function call<T>(personaId: number, kind: string, { limit, offset }: Page): Promise<Result<T>> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const query = params.size ? `?${params}` : "";
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${personaId}/suggestions/${kind}${query}`, {
      credentials: "include",
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body.error ?? "request_failed" };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

export const getSuggestedCommunities = (personaId: number, page: Page = {}) =>
  call<{ communities: Community[] }>(personaId, "communities", page);

export const getSuggestedChannels = (personaId: number, page: Page = {}) =>
  call<{ channels: SuggestedChannel[] }>(personaId, "channels", page);
