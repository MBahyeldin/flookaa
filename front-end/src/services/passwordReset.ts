import { apiFetch } from "@/lib/apiFetch";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function checkResetToken(token: string): Promise<"valid" | "invalid" | "error"> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/auth/password/reset/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (resp.ok) return "valid";
    return resp.status === 400 ? "invalid" : "error";
  } catch {
    return "error";
  }
}
