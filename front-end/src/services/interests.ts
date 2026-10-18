import { apiFetch } from "@/lib/apiFetch";
import type { AdminInterest, Interest, InterestInput } from "@/types/interest";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1${path}`, {
      credentials: "include",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: body.error ?? "request_failed" };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

export const listInterests = () => call<Interest[]>("/interests");

export const adminListInterests = () => call<AdminInterest[]>("/admin/interests");

export const createInterest = (input: InterestInput) =>
  call<AdminInterest>("/admin/interests", { method: "POST", body: JSON.stringify(input) });

export const updateInterest = (id: number, input: Partial<InterestInput>) =>
  call<AdminInterest>(`/admin/interests/${id}`, { method: "PATCH", body: JSON.stringify(input) });

export const moveInterest = (id: number, direction: "up" | "down") =>
  call<AdminInterest[]>(`/admin/interests/${id}/move`, { method: "POST", body: JSON.stringify({ direction }) });

export const setInterestRetired = (id: number, retired: boolean) =>
  call<AdminInterest>(`/admin/interests/${id}/${retired ? "retire" : "restore"}`, { method: "POST" });
