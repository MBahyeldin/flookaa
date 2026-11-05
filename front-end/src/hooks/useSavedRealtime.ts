import { useEffect } from "react";
import { useWebsocketService } from "@/Websocket.context";
import { useAppStore } from "@/stores/AppStore";
import type { SavedPayload } from "@/types/Ws";

/**
 * Applies the persona's saves from its other tabs and devices to the posts on
 * screen. The default subscription replays on connect, in order, so old frames
 * end on the same state. Mount once, inside the persona-selected dashboard.
 */
export default function useSavedRealtime(personaId: string | number | undefined) {
  const { websocketService } = useWebsocketService();

  useEffect(() => {
    if (!personaId) return;
    return websocketService?.subscribeToDefaultEvents((message) => {
      if (message.event?.name !== "saved") return;
      const { post_id } = message.payload as SavedPayload;
      useAppStore.getState().setPostSaved(post_id, message.event.action === "create");
    });
  }, [personaId, websocketService]);
}
