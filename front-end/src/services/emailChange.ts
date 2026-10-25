import { apiFetch } from "@/lib/apiFetch";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type EmailChangeResult =
  | { ok: true; retry_after?: number; email_address?: string }
  | { ok: false; error: string; retry_after?: number; attempts_left?: number };

async function post(path: string, body?: unknown): Promise<EmailChangeResult> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/users/email/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: Record<string, unknown> = await response.json().catch(() => ({}));
    const num = (k: string) => (typeof data[k] === "number" ? (data[k] as number) : undefined);
    if (response.ok) {
      return {
        ok: true,
        retry_after: num("retry_after"),
        email_address: typeof data.email_address === "string" ? data.email_address : undefined,
      };
    }
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "request_failed",
      retry_after: num("retry_after"),
      attempts_left: num("attempts_left"),
    };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

export const requestEmailChange = (email_address: string) => post("change", { email_address });
export const confirmEmailChange = (code: string) => post("confirm", { code });
export const cancelEmailChange = () => post("change/cancel");
