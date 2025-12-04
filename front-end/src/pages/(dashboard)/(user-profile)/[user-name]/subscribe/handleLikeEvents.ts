/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type Exact,
  type GetProfileQuery,
  type Scalars,
} from "@/generated/graphql";
import type { WsEventMessage } from "@/types/Ws";
import type { UpdateQueryMapFn } from "@apollo/client";

async function handleLikeEvents({
  payload,
  updateQuery,
}: {
  payload: WsEventMessage;
  updateQuery: (
    mapFn: UpdateQueryMapFn<
      GetProfileQuery,
      Exact<{
        id: Scalars["Int32"]["input"];
      }>
    >
  ) => void;
}) {
  const { target_id, target_type, action } = payload.event;
  const inc = action === "create" ? 1 : action === "delete" ? -1 : 0;
  if (target_type !== "POST") return;

  // ✅ Update the existing profile query cache
  updateQuery((prev) => {
    if (!prev?.getProfile) return prev;
    console.log("Previous profile data:", prev);

    const updatedPosts = prev.getProfile.posts?.map((p) => {
      if (p?._id !== target_id) return p;
      return {
        ...p,
        meta: { ...p.meta, likesCount: (p.meta?.likesCount || 0) + inc },
      };
    });

    return {
      ...prev,
      getProfile: {
        ...prev.getProfile,
        posts: updatedPosts,
      },
    } as any;
  });
}

export default handleLikeEvents;
