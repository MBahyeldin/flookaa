import { apiFetch } from "@/lib/apiFetch";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const VERIFY_EMAIL_FAILED_KEY = "verify_email_failed";

export type VerifyResult =
  | { ok: true }
  | { ok: false; error: string; attempts_left?: number };

export type ResendResult =
  | { ok: true; retry_after: number }
  | { ok: false; error: string; retry_after?: number };

async function post(path: string, body?: unknown) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON error body.
  }
  return { response, data };
}

export default async function verifyEmail(code: string): Promise<VerifyResult> {
  const { response, data } = await post("verify", { verification_code: code });
  if (response.ok) return { ok: true };
  return {
    ok: false,
    error: typeof data.error === "string" ? data.error : "verification_failed",
    attempts_left: typeof data.attempts_left === "number" ? data.attempts_left : undefined,
  };
}

export async function resendVerification(): Promise<ResendResult> {
  const { response, data } = await post("verify/resend");
  const retryAfter = typeof data.retry_after === "number" ? data.retry_after : undefined;
  if (response.ok) return { ok: true, retry_after: retryAfter ?? 60 };
  return {
    ok: false,
    error: typeof data.error === "string" ? data.error : "resend_failed",
    retry_after: retryAfter,
  };
}
