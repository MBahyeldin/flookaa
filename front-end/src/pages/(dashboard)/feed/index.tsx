import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Compass } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Post } from "@/components/post-card";
import { GetFeedDocument, type FeedChannel, type GetFeedQuery, type GetFeedQueryVariables } from "@/generated/graphql";
import client from "@/graphql/client";
import { useWebsocketService } from "@/Websocket.context";
import { isCurrentOwner, useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { PostEventPayload } from "@/types/Ws";
import handleChannelEvents from "../channels/[id]/subscribe/handleChannelEvents";

const PAGE_SIZE = 10;
// The server's page cap: more pending posts than this reload the feed instead.
const MAX_MERGE = 30;

type Status = "loading" | "ready" | "error";

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
  const setOwner = useAppStore((s) => s.setOwner);
  const resetPage = useAppStore((s) => s.resetPage);
  const addPosts = useAppStore((s) => s.addPosts);
  const posts = useAppStore((s) => s.posts);
  const storeOwner = useAppStore((s) => s.owner);

  const pageOwner = useMemo(() => ({ id: personaId, type: "FEED" as const }), [personaId]);
  const isStoreOnFeed = storeOwner?.type === "FEED" && storeOwner.id === personaId;

  const [status, setStatus] = useState<Status>("loading");
  const [channels, setChannels] = useState<Record<string, FeedChannel>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [newPosts, setNewPosts] = useState<PostEventPayload[]>([]);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const addChannels = useCallback((list: FeedChannel[]) => {
    setChannels((prev) => {
      const next = { ...prev };
      for (const c of list) next[String(c.id)] = c;
      return next;
    });
  }, []);

  const loadFirstPage = useCallback(async () => {
    setStatus("loading");
    try {
      const page = await fetchFeed({ limit: PAGE_SIZE });
      if (!isCurrentOwner(pageOwner)) return;
      addPosts(page.posts);
      addChannels(page.channels);
      setCursor(page.nextCursor ?? null);
      setStatus("ready");
    } catch {
      if (isCurrentOwner(pageOwner)) setStatus("error");
    }
  }, [pageOwner, addPosts, addChannels]);

  // Point the store at the feed before the first page lands, and clear it on leave.
  useEffect(() => {
    setOwner(pageOwner);
    loadFirstPage();
    return () => resetPage();
  }, [pageOwner, setOwner, resetPage, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await fetchFeed({ after: cursor, limit: PAGE_SIZE });
      if (!isCurrentOwner(pageOwner)) return;
      addPosts(page.posts);
      addChannels(page.channels);
      setCursor(page.nextCursor ?? null);
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, pageOwner, addPosts, addChannels]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || status !== "ready" || !cursor || moreFailed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, cursor, moreFailed, loadMore]);

  useEffect(() => {
    if (!websocketService) return;
    const noop = () => {};
    return websocketService.subscribeToFeedEvents(
      handleChannelEvents({
        setNewPosts,
        onMembershipEvent: noop,
        onInterestsChanged: noop,
        onCommunityChanged: noop,
        onInfoChanged: noop,
      })
    );
  }, [websocketService]);

  const showNewPosts = async () => {
    const known = new Set(Object.keys(useAppStore.getState().posts));
    const count = newPosts.length;
    setNewPosts([]);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (count > MAX_MERGE) {
      resetPage();
      setOwner(pageOwner);
      setChannels({});
      loadFirstPage();
      return;
    }
    setMerging(true);
    try {
      const page = await fetchFeed({ limit: count });
      if (!isCurrentOwner(pageOwner)) return;
      addPosts(page.posts);
      addChannels(page.channels);
      setNewlyAddedIds(new Set(page.posts.map((p) => p._id).filter((id) => !known.has(id))));
    } catch {
      // The posts arrive with the next load; the pill already went away.
    } finally {
      setMerging(false);
    }
  };

  useEffect(() => {
    if (newlyAddedIds.size === 0) return;
    const timer = setTimeout(() => setNewlyAddedIds(new Set()), 2200);
    return () => clearTimeout(timer);
  }, [newlyAddedIds]);

  const sortedPosts = useMemo(
    () =>
      isStoreOnFeed
        ? Object.values(posts).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
              String(b._id).localeCompare(String(a._id))
          )
        : [],
    [posts, isStoreOnFeed]
  );

  let body;
  if (status === "loading") {
    body = <SkeletonList count={3} variant="post" className="flex flex-col gap-6" />;
  } else if (status === "error") {
    body = <ErrorState title="Couldn't load your feed" onRetry={loadFirstPage} />;
  } else if (sortedPosts.length === 0 && newPosts.length === 0) {
    body = (
      <EmptyState
        icon={Compass}
        title="Your feed is quiet"
        body="Join a few channels and their posts will show up here."
        action={
          <Button asChild>
            <Link to="/channels">Discover channels</Link>
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

      {newPosts.length > 0 && status === "ready" ? (
        <div className="sticky top-4 z-10 mb-4 flex justify-center">
          <Button size="sm" className="rounded-full shadow-sm" loading={merging} onClick={showNewPosts}>
            <ArrowUp />
            {newPosts.length} new post{newPosts.length > 1 ? "s" : ""}
          </Button>
        </div>
      ) : null}

      {body}
    </div>
  );
}
