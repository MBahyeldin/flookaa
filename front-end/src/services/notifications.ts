import { apiFetch } from "@/lib/apiFetch";
import type { NotificationPage } from "@/types/notification";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

const BASE = `${API_BASE_URL}/api/v1/notifications`;

/** One page, newest first. Pass the previous page's next_cursor for the next one. */
export async function getNotifications(
  cursor: string | null = null,
  limit = 20
): Promise<NotificationPage | null> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  try {
    const resp = await apiFetch(`${BASE}?${params}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return null;
  }
}

export async function getUnreadCount(): Promise<number | null> {
  try {
    const resp = await apiFetch(`${BASE}/unread-count`);
    if (!resp.ok) return null;
    return (await resp.json()).count;
  } catch (err) {
    console.error("Failed to fetch unread notifications:", err);
    return null;
  }
}

export async function markNotificationsRead(ids: number[]): Promise<boolean> {
  try {
    const resp = await apiFetch(`${BASE}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    return resp.ok;
  } catch (err) {
    console.error("Failed to mark notifications read:", err);
    return false;
  }
}

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    const resp = await apiFetch(`${BASE}/read-all`, { method: "POST" });
    return resp.ok;
  } catch (err) {
    console.error("Failed to mark all notifications read:", err);
    return false;
  }
}
