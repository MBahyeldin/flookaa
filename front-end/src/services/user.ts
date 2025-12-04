import type { Profile } from "@/types/user";

export async function getUserData(): Promise<Profile | null> {
  try {
    const resp = await fetch(`/api/v1/users/profile`, {
      credentials: "include",
    });
    if (!resp.ok) return null;

    return (await resp.json()) as Profile;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
}

