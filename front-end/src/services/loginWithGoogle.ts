import { apiFetch } from "@/lib/apiFetch";
import { AUTH_NEXT_KEY } from "@/hooks/useResumeAuthNext";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined");
}

export default async function continueWithGoogle(state: "login" | "signup", next: string) {
    const googleLoginUrl = `${API_BASE_URL}/api/v1/auth/google?state=${state}`;
    const oAuthUrlResp = await apiFetch(googleLoginUrl, {
        method: "GET",
        credentials: "include",
    })

    if (!oAuthUrlResp.ok) {
        throw new Error("Failed to get Google OAuth URL");
    }

    // The callback always lands on "/", so the destination waits here.
    try {
        if (next !== "/") sessionStorage.setItem(AUTH_NEXT_KEY, next);
    } catch {
        // No storage: the user lands on "/".
    }

    const { url } = await oAuthUrlResp.json();
    window.location.href = url;
}
