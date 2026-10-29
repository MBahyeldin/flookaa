import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Post } from "@/components/post-card";
import { useLazyQuery } from "@apollo/client/react";
import { GetPostsDocument } from "@/generated/graphql";
import { useWebsocketService } from "@/Websocket.context";
import { isCurrentOwner, useAppStore } from "@/stores/AppStore";
import type { PostEventPayload } from "@/types/Ws";
import handleChannelEvents from "@/pages/(dashboard)/channels/[id]/subscribe/handleChannelEvents";
import loadNewPosts from "@/pages/(dashboard)/channels/[id]/subscribe/loadNewPosts";
import { ComposerBar } from "@/pages/(dashboard)/channels/[id]/ComposerBar";

const PAGE_SIZE = 10;

// The persona's wall: its own posts, only the persona writes here.
export function ProfilePosts({ personaId, name, isOwn }: { personaId: number; name: string; isOwn: boolean }) {
  const navigate = useNavigate();
  const { websocketService } = useWebsocketService();
  const setOwner = useAppStore((s) => s.setOwner);
  const resetPage = useAppStore((s) => s.resetPage);
  const addPosts = useAppStore((s) => s.addPosts);
  const setCanModerate = useAppStore((s) => s.setCanModerate);
  const posts = useAppStore((s) => s.posts);
  const storeOwner = useAppStore((s) => s.owner);
  const [fetchPosts] = useLazyQuery(GetPostsDocument, { fetchPolicy: "network-only" });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPosts, setNewPosts] = useState<PostEventPayload[]>([]);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  const owner = useMemo(() => ({ id: String(personaId), type: "PERSONA" as const }), [personaId]);
  const isStoreOnWall = storeOwner?.type === "PERSONA" && String(storeOwner.id) === String(personaId);

  const loadPage = async (from: number) => {
    const { data, error } = await fetchPosts({
      variables: { owner: { id: personaId, type: "PERSONA" }, limit: PAGE_SIZE, offset: from },
    }).catch((error: Error) => ({ data: undefined, error }));
    if (!isCurrentOwner(owner)) return null;
    if (error || !data) return null;
    addPosts(data.getPosts);
    setOffset(from + data.getPosts.length);
    setHasMore(data.getPosts.length === PAGE_SIZE);
    return data.getPosts;
  };

  const loadFirst = async () => {
    setStatus("loading");
    setStatus((await loadPage(0)) ? "ready" : "error");
  };

  // Point the store at the wall before its posts land, and clear it on leave.
  useEffect(() => {
    setOwner(owner);
    setCanModerate(isOwn);
    loadFirst();
    return () => resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, isOwn]);

  useEffect(() => {
    if (!websocketService) return;
    const noop = () => {};
    return websocketService.subscribeToProfileEvents(
      personaId,
      handleChannelEvents({
        setNewPosts,
        onMembershipEvent: noop,
        onInterestsChanged: noop,
        onCommunityChanged: noop,
        onInfoChanged: noop,
      })
    );
  }, [websocketService, personaId]);

  useEffect(() => {
    if (newlyAddedIds.size === 0) return;
    const timer = setTimeout(() => setNewlyAddedIds(new Set()), 2200);
    return () => clearTimeout(timer);
  }, [newlyAddedIds]);

  const showNewPosts = () => {
    setNewlyAddedIds(new Set(newPosts.map((p) => p.object_id)));
    setNewPosts([]);
    loadNewPosts({ newPosts });
  };

  const loadMore = async () => {
    setLoadingMore(true);
    const page = await loadPage(offset);
    setLoadingMore(false);
    if (!page) toast.error("Couldn't load more posts");
  };

  const sortedPosts = useMemo(
    () =>
      isStoreOnWall
        ? Object.values(posts).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [posts, isStoreOnWall]
  );

  const composer = isOwn && (
    <ComposerBar channelName={name} placeholder="Write on your wall…" title="New post on your wall" />
  );

  if (status === "loading") return <SkeletonList count={2} variant="post" className="flex flex-col gap-6" />;
  if (status === "error") return <ErrorState title="Couldn't load posts" onRetry={loadFirst} />;

  return (
    <div className="flex flex-col gap-6">
      {composer}

      {newPosts.length > 0 && (
        <button
          type="button"
          onClick={showNewPosts}
          className="w-full cursor-pointer rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-center text-sm font-medium text-success transition-colors hover:bg-success/20"
        >
          {newPosts.length} new post{newPosts.length > 1 ? "s" : ""} available
        </button>
      )}

      {sortedPosts.length === 0 && newPosts.length === 0 ? (
        <EmptyState
          icon={isOwn ? PenLine : MessageSquare}
          title={isOwn ? "Write your first post" : "No posts yet"}
          body={isOwn ? "Your wall is yours: whoever sees this persona can read it." : `${name} hasn't posted yet.`}
        />
      ) : (
        sortedPosts.map((post) => (
          <Post
            key={post._id}
            post={post}
            version="canvas"
            canModerate={isOwn}
            onOpen={() => navigate(`/personas/${personaId}/posts/${post._id}`)}
            isNew={newlyAddedIds.has(post._id)}
          />
        ))
      )}

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" size="lg" className="px-8" loading={loadingMore} onClick={loadMore}>
            Load more posts
          </Button>
        </div>
      )}
    </div>
  );
}
