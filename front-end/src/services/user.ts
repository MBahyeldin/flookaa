import type { Profile } from "@/types/user";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getUserData(): Promise<Profile | null> {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not defined");
  }
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
      credentials: "include",
    });
    if (!resp.ok) return null;

    return (await resp.json()) as Profile;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
}

