import type {
  Exact,
  GetProfileQuery,
  Scalars,
  Comment,
  Reply,
} from "@/generated/graphql";
import type { PostEventPayload, WsEventMessage } from "@/types/Ws";
import type { UpdateQueryMapFn } from "node_modules/@apollo/client/core/watchQueryOptions";
import handleCommentEvents from "./handleCommentEvents";
import handleReplyEvents from "./handleReplyEvents";
import handleLikeEvents from "./handleLikeEvents";

export default function handleProfileEvents({
  setNewPosts,
  updateQuery,
}: {
  setNewPosts: React.Dispatch<React.SetStateAction<PostEventPayload[]>>;
  updateQuery: (
    mapFn: UpdateQueryMapFn<
      GetProfileQuery,
      Exact<{
        id: Scalars["Int64"]["input"];
      }>
    >
  ) => void;
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
          eventMetadata: parsedPayload.payload as Comment,
          updateQuery,
        });
        break;
      case "reply":
        handleReplyEvents({
          eventMetadata: parsedPayload.payload as Reply,
          updateQuery,
        });
        break;
      case "like":
        handleLikeEvents({
          payload: parsedPayload,
          updateQuery,
        });
        break;
      default:
        console.warn(`Unhandled event type: ${payload.event.name}`);
    }
  };
}
