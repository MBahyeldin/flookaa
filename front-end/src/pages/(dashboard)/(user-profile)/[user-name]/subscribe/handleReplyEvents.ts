/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type Exact,
  type GetProfileQuery,
  type Reply,
  type Scalars,
} from "@/generated/graphql";
import type { UpdateQueryMapFn } from "@apollo/client";

async function handleCommentEvents({
  eventMetadata,
  updateQuery,
}: {
  eventMetadata: Reply;
  updateQuery: (
    mapFn: UpdateQueryMapFn<
      GetProfileQuery,
      Exact<{
        id: Scalars["Int32"]["input"];
      }>
    >
  ) => void;
}) {
  console.log("handleReplyEvents called with:", eventMetadata);

  const newReplyRootId = eventMetadata.commentId;
  if (!newReplyRootId) return;
  console.log("Handling new reply event:", eventMetadata);

  // ✅ Update the existing profile query cache
  updateQuery((prev) => {
    if (!prev?.getProfile) return prev;
    console.log("Previous profile data:", prev);

    const targetPostId = eventMetadata.postId;
    if (!targetPostId) return prev;

    const targetCommentId = eventMetadata.commentId;
    if (!targetCommentId) return prev;

    const newReply: Reply = {
      __typename: "Reply",
      ...eventMetadata,
    };

    const updatedPosts = prev.getProfile.posts?.map((post) => {
      if (post?._id === targetPostId) {
        const updatedComments = post?.comments?.map((comment) => {
          if (comment?._id === targetCommentId) {
            // Prevent duplicates
            const existingIds = comment?.replies
              ? new Set(comment.replies.map((r) => r?._id))
              : new Set();
            if (existingIds.has(newReply._id)) {
              return comment;
            }
            return {
              ...comment,
              replies: [...(comment?.replies || []), newReply],
            };
          }
          return comment;
        });
        return {
          ...post,
          comments: updatedComments,
        };
      }
      return post;
    });

    return {
      ...prev,
      getProfile: {
        ...prev.getProfile,
        posts: updatedPosts,
      },
    } as any; // Using 'any' to bypass strict type checks
  });
}

export default handleCommentEvents;
