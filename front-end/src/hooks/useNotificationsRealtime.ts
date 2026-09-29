import { useEffect } from "react";
import { useWebsocketService } from "@/Websocket.context";
import { useNotificationStore } from "@/stores/NotificationStore";

/**
 * Keeps the unread badge current: loads it once, then refreshes on every
 * notifications.* frame of the persona's default subscription. Mount once,
 * inside the persona-selected dashboard.
 */
export default function useNotificationsRealtime(personaId: string | number | undefined) {
  const { websocketService } = useWebsocketService();

  useEffect(() => {
    if (!personaId) return;
    const { refreshUnread, onRealtimeEvent, reset } = useNotificationStore.getState();
    refreshUnread();

    const unsubscribe = websocketService?.subscribeToDefaultEvents((message) => {
      if (message.event?.name === "notifications") onRealtimeEvent();
    });
    return () => {
      unsubscribe?.();
      reset();
    };
  }, [personaId, websocketService]);
}
