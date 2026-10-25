import { useCallback, useMemo, useRef } from "react";
import { ArrowUp, Compass } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Post } from "@/components/post-card";
import { GetFeedDocument, type GetFeedQuery, type GetFeedQueryVariables } from "@/generated/graphql";
import client from "@/graphql/client";
import { useWebsocketService } from "@/Websocket.context";
import { useChannelPostsPager } from "@/hooks/useChannelPostsPager";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { MessageListener } from "@/ws";

const PAGE_SIZE = 10;

async function fetchFeed(variables: GetFeedQueryVariables) {
  const { data } = await client.query<GetFeedQuery, GetFeedQueryVariables>({
    query: GetFeedDocument,
    variables,
    fetchPolicy: "no-cache",
  });
  if (!data) throw new Error("empty feed response");
  return data.getFeed;
}

export default function FeedPage() {
  const personaId = useUserProfileStore((s) => s.persona?.id);
  // A persona switch reloads the app, but keying keeps each persona's feed apart anyway.
  return personaId ? <FeedView key={personaId} personaId={String(personaId)} /> : null;
}

function FeedView({ personaId }: { personaId: string }) {
  const navigate = useNavigate();
  const { websocketService } = useWebsocketService();
  const topRef = useRef<HTMLDivElement>(null);
  const owner = useMemo(() => ({ id: personaId, type: "FEED" as const }), [personaId]);
  const subscribe = useCallback(
    (callback: MessageListener) => websocketService!.subscribeToFeedEvents(callback),
    [websocketService]
  );
  const {
    status,
    channels,
    sortedPosts,
    loadFirstPage,
    loadMore,
    loadingMore,
    moreFailed,
    sentinel,
    newPostsCount,
    showNewPosts,
    merging,
    newlyAddedIds,
  } = useChannelPostsPager({
    owner,
    pageSize: PAGE_SIZE,
    fetchPage: fetchFeed,
    subscribe: websocketService ? subscribe : undefined,
  });

  const onShowNewPosts = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    showNewPosts();
  };

  let body;
  if (status === "loading") {
    body = <SkeletonList count={3} variant="post" className="flex flex-col gap-6" />;
  } else if (status === "error") {
    body = <ErrorState title="Couldn't load your feed" onRetry={loadFirstPage} />;
  } else if (sortedPosts.length === 0 && newPostsCount === 0) {
    body = (
      <EmptyState
        icon={Compass}
        title="Your feed is quiet"
        body="Join a few channels and their posts will show up here."
        action={
          <Button asChild>
            <Link to="/discover">Discover channels</Link>
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-6">
        {sortedPosts.map((post) => {
          const channel = channels[String(post.owner.id)];
          return (
            <Post
              key={post._id}
              post={post}
              version="spine"
              channel={channel ? { id: channel.id, name: channel.name, theme: channel.theme } : undefined}
              canModerate={channel?.canModerate ?? false}
              onOpen={() => navigate(`/channels/${post.owner.id}/posts/${post._id}`)}
              isNew={newlyAddedIds.has(post._id)}
            />
          );
        })}
        {loadingMore && <SkeletonList count={2} variant="post" className="flex flex-col gap-6" />}
        {moreFailed && (
          <div role="alert" className="flex items-center justify-center gap-3 py-4 text-sm text-muted-foreground">
            Couldn't load more posts.
            <Button variant="outline" size="sm" onClick={loadMore}>
              Retry
            </Button>
          </div>
        )}
        <div ref={sentinel} aria-hidden />
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto w-full max-w-[1040px] scroll-mt-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1>Your feed</h1>
        <p className="text-muted-foreground">New posts from the channels you're in.</p>
      </header>

      {newPostsCount > 0 && status === "ready" ? (
        <div className="sticky top-4 z-10 mb-4 flex justify-center">
          <Button size="sm" className="rounded-full shadow-sm" loading={merging} onClick={onShowNewPosts}>
            <ArrowUp />
            {newPostsCount} new post{newPostsCount > 1 ? "s" : ""}
          </Button>
        </div>
      ) : null}

      {body}
    </div>
  );
}
