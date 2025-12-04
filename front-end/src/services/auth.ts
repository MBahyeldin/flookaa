import type { Info } from "@/types/auth";

export async function fetchCurrentUser(): Promise<Info | null> {
  try {
    const isLoggedIn = localStorage.getItem("loginSuccess");
    if (!isLoggedIn) return null;

    const resp = await fetch(`/api/v1/auth/info`, { credentials: "include" });
    if (!resp.ok) return null;

    return (await resp.json()) as Info;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
}

export async function logOut(): Promise<void> {
  console.log("Logging out...");

  try {
    await fetch(`/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    localStorage.removeItem("loginSuccess");
  } catch (err) {
    console.error("Failed to sign out:", err);
  }
}
