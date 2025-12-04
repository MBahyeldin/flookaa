import { GetPostsDocument, type GetPostsQuery } from "@/generated/graphql";
import client from "@/graphql/client";
import { useAppStore } from "@/stores/AppStore";

async function loadNewPosts({
  newPosts,
}: {
  newPosts: { object_id: string }[];
}) {
  const newPostsIds = newPosts.map((post) => post.object_id);
  const owner = useAppStore.getState().owner;
  const addPosts = useAppStore.getState().addPosts;
  console.log({
    owner,
  });

  const channelId = owner?.id;
  if (newPostsIds.length === 0 || !channelId) return;
  const channelIdNum = parseInt(channelId, 10);
  if (isNaN(channelIdNum)) return;

  // Fetch fresh posts from server
  const { data: fetched } = await client.query<GetPostsQuery>({
    query: GetPostsDocument,
    variables: {
      ids: newPostsIds,
      limit: newPostsIds.length,
      offset: 0,
      owner: { id: channelIdNum, type: "CHANNEL" },
    },
    fetchPolicy: "network-only",
  });

  const fetchedPosts = fetched?.getPosts ?? [];
  if (fetchedPosts.length === 0) return;

  // Add fetched posts to the app store
  addPosts(fetchedPosts);
}

export default loadNewPosts;
