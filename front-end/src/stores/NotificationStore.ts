import { create } from "zustand";
import type { Notification } from "@/types/notification";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationsRead,
} from "@/services/notifications";

/** How many the bell's popover shows. */
export const RECENT_LIMIT = 10;

export interface NotificationState {
  unreadCount: number;
  /** The popover's list; null until first opened. */
  recent: Notification[] | null;
  /**
   * Bumped on every realtime notification frame, so open lists (the
   * /notifications page) know to reload.
   */
  version: number;

  refreshUnread: () => Promise<void>;
  refreshRecent: () => Promise<void>;
  /** A notifications.create/delete frame arrived. */
  onRealtimeEvent: () => void;
  /** Marks one read (optimistically) when it's clicked. */
  markRead: (notification: Notification) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

// Responses can arrive out of order; only the latest request may write.
let unreadRequest = 0;
let recentRequest = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  recent: null,
  version: 0,

  refreshUnread: async () => {
    const request = ++unreadRequest;
    const count = await getUnreadCount();
    if (count !== null && request === unreadRequest) set({ unreadCount: count });
  },

  refreshRecent: async () => {
    const request = ++recentRequest;
    const page = await getNotifications(null, RECENT_LIMIT);
    if (page && request === recentRequest) set({ recent: page.notifications });
  },

  onRealtimeEvent: () => {
    set((s) => ({ version: s.version + 1 }));
    get().refreshUnread();
    if (get().recent !== null) get().refreshRecent();
  },

  markRead: async (notification) => {
    if (notification.read) return;
    set((s) => ({
      unreadCount: Math.max(0, s.unreadCount - 1),
      recent: s.recent?.map((n) => (n.id === notification.id ? { ...n, read: true } : n)) ?? null,
    }));
    if (!(await markNotificationsRead([notification.id]))) get().refreshUnread();
  },

  markAllRead: async () => {
    set((s) => ({
      unreadCount: 0,
      recent: s.recent?.map((n) => ({ ...n, read: true })) ?? null,
    }));
    if (!(await markAllNotificationsRead())) get().refreshUnread();
    set((s) => ({ version: s.version + 1 }));
  },

  reset: () => {
    unreadRequest++;
    recentRequest++;
    set({ unreadCount: 0, recent: null });
  },
}));
