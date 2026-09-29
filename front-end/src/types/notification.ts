/** Kinds the backend can send (notification_kind_enum). */
type NotificationKind =
  | "post_comment"
  | "comment_reply"
  | "post_like"
  | "comment_like"
  | "join_request"
  | "request_approved"
  | "removed_from_channel";

type NotificationActor = {
  id: number;
  first_name: string;
  last_name: string;
  thumbnail: string;
};

type NotificationChannel = {
  id: number;
  name: string;
  thumbnail: string;
};

/**
 * Facts fixed for the notification's life (shared/pkg/notifications.Data).
 * Every field is optional: rows written before a field existed lack it.
 */
type NotificationData = {
  /** The post at the top of the thread, for content kinds. */
  post_id?: string;
};

type Notification = {
  id: number;
  /** A string, not NotificationKind: the backend may add kinds first. */
  kind: string;
  subject: { type: "POST" | "COMMENT" | "CHANNEL" | "PERSONA"; id: string };
  /** Null for personal (membership) notifications. */
  scope: { type: "CHANNEL"; id: number } | null;
  /** How many personas are behind it (1 for single-actor kinds). */
  count: number;
  /** Null for system kinds or a deleted persona. */
  latest_actor: NotificationActor | null;
  /** Read-time lookup; null when the channel was deleted. */
  channel: NotificationChannel | null;
  data?: NotificationData;
  read: boolean;
  updated_at: string;
};

type NotificationPage = {
  notifications: Notification[];
  /** Null on the last page. A page may be short, or empty, and still have one. */
  next_cursor: string | null;
};

export type {
  NotificationKind,
  NotificationActor,
  NotificationChannel,
  NotificationData,
  Notification,
  NotificationPage,
};
