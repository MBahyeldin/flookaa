import type {
  Comment,
} from "@/generated/graphql";
import type {
  ChannelEventPayload,
  PostEventPayload,
  WsEventMessage,
} from "@/types/Ws";
import handleCommentEvents from "./handleCommentEvents";
import handleLikeEvents from "./handleLikeEvents";
import { useAppStore } from "@/stores/AppStore";

/** Payload of post.delete and comment.delete events. */
type DeleteEventPayload = { object_id: string };

export default function handleChannelEvents({
  setNewPosts,
  onMembershipEvent,
}: {
  setNewPosts: React.Dispatch<React.SetStateAction<PostEventPayload[]>>;
  /** member, follower and join_request events; the page owns that state. */
  onMembershipEvent: (
    event: WsEventMessage["event"],
    payload: ChannelEventPayload
  ) => void;
}) {
  return (payload: WsEventMessage) => {
    if (!payload) return;
    const parsedPayload = JSON.parse(JSON.stringify(payload)) as WsEventMessage;
    switch (payload.event.name) {
      case "post":
        if (parsedPayload.event.action === "delete") {
          const { object_id } = parsedPayload.payload as DeleteEventPayload;
          setNewPosts((prev) => prev.filter((p) => p.object_id !== object_id));
          useAppStore.getState().removePost(object_id);
          break;
        }
        setNewPosts((prev) => [
          ...prev,
          parsedPayload.payload as PostEventPayload,
        ]);
        break;
      case "comment":
        if (parsedPayload.event.action === "delete") {
          // target_id/target_type are the deleted comment's parent.
          const { target_id, target_type } = parsedPayload.event;
          const { object_id } = parsedPayload.payload as DeleteEventPayload;
          if (target_type === "POST" || target_type === "COMMENT") {
            useAppStore.getState().removeComment(object_id, target_id, target_type);
          }
          break;
        }
        handleCommentEvents({
          targetType: parsedPayload.event.target_type,
          eventMetadata: parsedPayload.payload as Comment,
        });
        break;
      case "like":
        handleLikeEvents({
          payload: parsedPayload,
        });
        break;
      case "member":
      case "follower":
      case "join_request":
        onMembershipEvent(
          parsedPayload.event,
          parsedPayload.payload as ChannelEventPayload
        );
        break;
      default:
        console.warn(`Unhandled event type: ${payload.event.name}`);
    }
  };
}
