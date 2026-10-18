import { apiFetch } from "@/lib/apiFetch";
import type { Gender, Profile } from "@/types/user";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getUserData(): Promise<Profile | null> {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not defined");
  }
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/users/profile`, {
      credentials: "include",
    });
    if (!resp.ok) return null;

    return (await resp.json()) as Profile;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
}


export type ProfilePatch = Partial<{ date_of_birth: string; gender: Gender }>;

export async function updateProfile(patch: ProfilePatch): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/users/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      credentials: "include",
    });
    if (resp.ok) return { ok: true };
    const body = await resp.json().catch(() => ({}));
    return { ok: false, error: body.error ?? "request_failed" };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}
