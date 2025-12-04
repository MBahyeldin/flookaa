/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type Comment,
  type Exact,
  type GetProfileQuery,
  type Scalars,
} from "@/generated/graphql";
import type { UpdateQueryMapFn } from "@apollo/client";

async function handleCommentEvents({
  eventMetadata,
  updateQuery,
}: {
  eventMetadata: Comment;
  updateQuery: (
    mapFn: UpdateQueryMapFn<
      GetProfileQuery,
      Exact<{
        id: Scalars["Int32"]["input"];
      }>
    >
  ) => void;
}) {
  const newCommentParentId = eventMetadata.parentId;
  if (!newCommentParentId) return;
  console.log("Handling new comment event:", eventMetadata);

  // ✅ Update the existing profile query cache
  updateQuery((prev) => {
    if (!prev?.getProfile) return prev;
    console.log("Previous profile data:", prev);

    const targetPost = prev.getProfile.posts?.find(
      (p) => p?._id === newCommentParentId
    );
    if (!targetPost) return prev;

    const newComment: Comment = {
      __typename: "Comment",
      ...eventMetadata,
    };

    // Prevent duplicates
    const existingIds = new Set(targetPost.comments?.map((c) => c?._id));
    if (existingIds.has(newComment._id)) {
      return prev; // Comment already exists, no need to add
    }

    console.log("Adding new comment to post:", newComment);
    const updatedPosts = prev.getProfile.posts?.map((p) =>
      p?._id === newCommentParentId
        ? {
            ...p,
            comments: p?.comments ? [...p.comments, newComment] : [newComment],
            meta: {
              ...p?.meta,
              commentsCount: (p?.meta?.commentsCount || 0) + 1,
            },
          }
        : p
    );
    console.log(
      "Updated posts after adding comment  comment event:",
      updatedPosts
    );

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
