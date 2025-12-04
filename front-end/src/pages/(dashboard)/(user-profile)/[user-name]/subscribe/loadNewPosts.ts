/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  GetPostsDocument,
  type Exact,
  type GetProfileQuery,
  type GetPostsQuery,
  type Scalars,
} from "@/generated/graphql";
import client from "@/graphql/client";
import type { PostEventPayload } from "@/types/Ws";
import type { UpdateQueryMapFn } from "@apollo/client";

async function loadNewPosts({
  profileId,
  newPosts,
  updateQuery,
}: {
  profileId?: string;
  newPosts: PostEventPayload[];
  updateQuery: (
    mapFn: UpdateQueryMapFn<
      GetProfileQuery,
      Exact<{
        id: Scalars["Int32"]["input"];
      }>
    >
  ) => void;
}) {
  const newPostsIds = newPosts.map((post) => post.object_id);
  if (newPostsIds.length === 0 || !profileId) return;
  const profileIdNum = parseInt(profileId, 10);
  if (isNaN(profileIdNum)) return;

  // Fetch fresh posts from server
  const { data: fetched } = await client.query<GetPostsQuery>({
    query: GetPostsDocument,
    variables: {
      ids: newPostsIds,
      limit: newPostsIds.length,
      offset: 0,
      owner: { id: profileIdNum, type: "CHANNEL" },
    },
    fetchPolicy: "network-only",
  });

  const fetchedPosts = fetched?.getPosts ?? [];
  if (fetchedPosts.length === 0) return;

  // ✅ Update the existing profile query cache
  updateQuery((prev) => {
    if (!prev?.getProfile) return prev;

    // Prevent duplicates
    const existingIds = new Set(prev.getProfile.posts?.map((p) => p?._id));
    const mergedPosts = [
      ...fetchedPosts
        .filter((p) => !existingIds.has(p._id))
        .sort((a, b) => {
          // Sort by creation date descending
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }),
      ...(prev.getProfile.posts ?? []),
    ];

    return {
      ...prev,
      getProfile: {
        ...prev.getProfile,
        posts: mergedPosts,
      },
    } as any;
  });
}

export default loadNewPosts;
