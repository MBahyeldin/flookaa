import type { Channel } from "@/types/channel";

export async function getChannels(): Promise<{ channels: Channel[] } | null> {
  try {
    const resp = await fetch(`/api/v1/channels`, {
      credentials: "include",
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
}

export async function joinChannel(channelId: string): Promise<Error | null> {
  try {
    const resp = await fetch(`/api/v1/channels/join/${channelId}`, {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok)
      return new Error((await resp.json()).error || "Failed to join channel");
    return null;
  } catch (err) {
    return err as Error | null;
  }
}

export async function leaveChannel(channelId: string): Promise<Error | null> {
  try {
    const resp = await fetch(`/api/v1/channels/leave/${channelId}`, {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok)
      return new Error((await resp.json()).error || "Failed to leave channel");
    return null;
  } catch (err) {
    return err as Error | null;
  }
}
