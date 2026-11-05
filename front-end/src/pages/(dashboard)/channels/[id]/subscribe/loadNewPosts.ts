import { GetPostsDocument, type GetPostsQuery } from "@/generated/graphql";
import client from "@/graphql/client";
import { contentOwner, isCurrentOwner, useAppStore } from "@/stores/AppStore";

async function loadNewPosts({
  newPosts,
}: {
  newPosts: { object_id: string }[];
}) {
  const newPostsIds = newPosts.map((post) => post.object_id);
  const owner = useAppStore.getState().owner;
  const addPosts = useAppStore.getState().addPosts;
  // A channel or a persona's wall.
  const content = contentOwner(owner);
  if (newPostsIds.length === 0 || !content) return;
  const ownerId = parseInt(String(content.id), 10);
  if (isNaN(ownerId)) return;

  // Fetch fresh posts from server
  const { data: fetched } = await client.query<GetPostsQuery>({
    query: GetPostsDocument,
    variables: {
      ids: newPostsIds,
      limit: newPostsIds.length,
      offset: 0,
      owner: { id: ownerId, type: content.type },
    },
    fetchPolicy: "network-only",
  });

  const fetchedPosts = fetched?.getPosts ?? [];
  if (fetchedPosts.length === 0) return;
  if (!owner || !isCurrentOwner(owner)) return;

  // Add fetched posts to the app store
  addPosts(fetchedPosts);
}

export default loadNewPosts;
