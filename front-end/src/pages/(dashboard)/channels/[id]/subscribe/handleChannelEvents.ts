import type {
  Comment,
} from "@/generated/graphql";
import type { PostEventPayload, WsEventMessage } from "@/types/Ws";
import handleCommentEvents from "./handleCommentEvents";
import handleLikeEvents from "./handleLikeEvents";

export default function handleChannelEvents({
  setNewPosts,
}: {
  setNewPosts: React.Dispatch<React.SetStateAction<PostEventPayload[]>>;
}) {
  return (payload: WsEventMessage) => {
    if (!payload) return;
    const parsedPayload = JSON.parse(JSON.stringify(payload)) as WsEventMessage;
    switch (payload.event.name) {
      case "post":
        setNewPosts((prev) => [
          ...prev,
          parsedPayload.payload as PostEventPayload,
        ]);
        break;
      case "comment":
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
      default:
        console.warn(`Unhandled event type: ${payload.event.name}`);
    }
  };
}
