import type { Comment, Owner, Privacy } from "@/generated/graphql";

type WsMessageType = "PING" | "SUBSCRIBE" | "UNSUBSCRIBE" | "MESSAGE";

type WsMessage<P> = {
  type: WsMessageType;
  payload?: P;
  id: string;
};

type EventType =
  | "post"
  | "comment"
  | "reply"
  | "like"
  // Channel membership (STREAM_CHANNEL_EVENTS); payload is ChannelEventPayload.
  | "member"
  | "follower"
  | "join_request"
  // Per persona (STREAM_USER_EVENTS, default subscription); payload is
  // NotificationPayload. Only the id: refetch over REST.
  | "notifications"
  | "*";
type EventActionType = "create" | "update" | "delete" | "*";
type EventOwnerType = "CHANNEL" | "USER" | "PERSONA";

type SubscribeChannelPayload = {
  event: EventType;
  event_action: EventActionType;
  owner: "CHANNEL";
  owner_id: number;
};

type SubscribeDefaultPayload = {
  owner: "DEFAULT";
};

type Event = {
  name: EventType;
  action: EventActionType;
  target_id: string;
  target_type: "POST" | "COMMENT" | "REPLY" | "USER" | "CHANNEL";
  post_id?: string;
  comment_id?: string;
  owner: EventOwnerType;
  owner_id: number;
  actor_id: number;
  /** Author of the target, on comment/like events (for the notifier). */
  recipient_id?: number;
  timestamp: number;
};

type WsEventMessage = {
  event: Event;
  payload: Comment | PostEventPayload | ChannelEventPayload | NotificationPayload;
};

/**
 * Payload of member, follower and join_request events. persona_id is whose
 * membership changed; the event's actor_id is who changed it (a moderator for
 * approved, rejected and removed).
 */
type ChannelEventPayload = {
  persona_id: number;
  reason:
    | "joined"
    | "approved"
    | "rejected"
    | "requested"
    | "cancelled"
    | "left"
    | "removed"
    | "followed"
    | "unfollowed";
};

/** Payload of notifications.create / notifications.delete. */
type NotificationPayload = {
  notification_id: number;
};

type PostEventPayload = {
  author_id: number;
  created_at: string;
  object_id: string;
  owner: Owner;
  tags: string[];
  privacy: Privacy;
  allowedUserIds: number[];
  deniedUserIds: number[];
};

export type {
  WsMessage,
  WsMessageType,
  SubscribeChannelPayload,
  SubscribeDefaultPayload,
  Event,
  EventType,
  EventActionType,
  PostEventPayload,
  ChannelEventPayload,
  NotificationPayload,
  EventOwnerType,
  WsEventMessage,
};
