import { type Comment } from "@/generated/graphql";
import { useAppStore } from "@/stores/AppStore";
import type { WsEventMessage } from "@/types/Ws";

async function handleCommentEvents({
  eventMetadata,
  targetType,
}: {
  eventMetadata: Comment;
  targetType: WsEventMessage["event"]["target_type"];
}) {
  const newCommentParentId = eventMetadata.parentId;
  if (!newCommentParentId) return;
  if (targetType === "COMMENT") {
    const addComment = useAppStore.getState().addCommentToComment;
    addComment(eventMetadata);
    return;
  }
  const addComment = useAppStore.getState().addCommentToPost;
  console.log("Handling new comment event:", eventMetadata);
  addComment(eventMetadata);
}

export default handleCommentEvents;
