import type { Info } from "@/types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export async function fetchCurrentUser(): Promise<Info | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/auth/info`, { credentials: "include" });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Info;
    return (data);
  } catch (err) {
    console.error("Logout failed:", err);
    return null;
  }
}

export async function logOut(): Promise<void> {

  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    localStorage.removeItem("loginSuccess");
  } catch (err) {
    console.error("Failed to sign out:", err);
  }
}
