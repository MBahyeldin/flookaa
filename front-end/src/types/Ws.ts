import type { Comment, Owner, Privacy, Reply } from "@/generated/graphql";

type WsMessageType = "PING" | "SUBSCRIBE" | "UNSUBSCRIBE" | "MESSAGE";

type WsMessage<P> = {
  type: WsMessageType;
  payload?: P;
  id: string;
};

type EventType = "post" | "comment" | "reply" | "like" | "*";
type EventActionType = "create" | "update" | "delete" | "*";
type EventOwnerType = "CHANNEL" | "USER";

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
  timestamp: number;
};

type WsEventMessage = {
  event: Event;
  payload: Comment | Reply | PostEventPayload;
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
  EventOwnerType,
  WsEventMessage,
};
