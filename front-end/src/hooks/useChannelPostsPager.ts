import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedChannel, FeedPage, Post } from "@/generated/graphql";
import { isCurrentOwner, useAppStore, type ListOwner } from "@/stores/AppStore";
import type { MessageListener } from "@/ws";
import type { PostEventPayload } from "@/types/Ws";
import handleChannelEvents from "@/pages/(dashboard)/channels/[id]/subscribe/handleChannelEvents";

type Status = "loading" | "ready" | "error";
type Page = Pick<FeedPage, "nextCursor"> & { posts: Post[]; channels: FeedChannel[] };

// The server's page cap: more pending posts than this reload instead.
const MAX_MERGE = 30;

/**
 * Pages posts of many channels (feed, Discover) into AppStore under `owner`,
 * loads more through `sentinel`, and collects new posts behind a pill.
 * Without `mergeNew`, showing new posts reloads the first page.
 */
export function useChannelPostsPager({
  owner,
  pageSize,
  fetchPage,
  subscribe,
  mergeNew = true,
}: {
  owner: ListOwner;
  pageSize: number;
  fetchPage: (variables: { after?: string; limit: number }) => Promise<Page>;
  subscribe?: (callback: MessageListener) => () => void;
  mergeNew?: boolean;
}) {
  const setOwner = useAppStore((s) => s.setOwner);
  const resetPage = useAppStore((s) => s.resetPage);
  const addPosts = useAppStore((s) => s.addPosts);
  const posts = useAppStore((s) => s.posts);
  const storeOwner = useAppStore((s) => s.owner);
  const isStoreOnOwner = storeOwner?.type === owner.type && storeOwner.id === owner.id;

  const [status, setStatus] = useState<Status>("loading");
  const [channels, setChannels] = useState<Record<string, FeedChannel>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [newPosts, setNewPosts] = useState<PostEventPayload[]>([]);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

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
      const page = await fetchPage({ limit: pageSize });
      if (!isCurrentOwner(owner)) return;
      addPosts(page.posts);
      addChannels(page.channels);
      setCursor(page.nextCursor ?? null);
      setStatus("ready");
    } catch {
      if (isCurrentOwner(owner)) setStatus("error");
    }
  }, [owner, pageSize, fetchPage, addPosts, addChannels]);

  // Point the store at the list before the first page lands, and clear it on leave.
  useEffect(() => {
    setOwner(owner);
    loadFirstPage();
    return () => resetPage();
  }, [owner, setOwner, resetPage, loadFirstPage]);

  const reload = useCallback(() => {
    resetPage();
    setOwner(owner);
    setChannels({});
    setCursor(null);
    loadFirstPage();
  }, [owner, resetPage, setOwner, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await fetchPage({ after: cursor, limit: pageSize });
      if (!isCurrentOwner(owner)) return;
      addPosts(page.posts);
      addChannels(page.channels);
      setCursor(page.nextCursor ?? null);
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, owner, pageSize, fetchPage, addPosts, addChannels]);

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
    if (!subscribe) return;
    const noop = () => {};
    return subscribe(
      handleChannelEvents({
        setNewPosts,
        onMembershipEvent: noop,
        onInterestsChanged: noop,
        onCommunityChanged: noop,
        onInfoChanged: noop,
      })
    );
  }, [subscribe]);

  const showNewPosts = useCallback(async () => {
    const known = new Set(Object.keys(useAppStore.getState().posts));
    const count = newPosts.length;
    setNewPosts([]);
    if (!mergeNew || count > MAX_MERGE) {
      reload();
      return;
    }
    setMerging(true);
    try {
      const page = await fetchPage({ limit: count });
      if (!isCurrentOwner(owner)) return;
      addPosts(page.posts);
      addChannels(page.channels);
      setNewlyAddedIds(new Set(page.posts.map((p) => p._id).filter((id) => !known.has(id))));
    } catch {
      // The posts arrive with the next load; the pill already went away.
    } finally {
      setMerging(false);
    }
  }, [newPosts.length, mergeNew, reload, fetchPage, owner, addPosts, addChannels]);

  useEffect(() => {
    if (newlyAddedIds.size === 0) return;
    const timer = setTimeout(() => setNewlyAddedIds(new Set()), 2200);
    return () => clearTimeout(timer);
  }, [newlyAddedIds]);

  const sortedPosts = useMemo(
    () =>
      isStoreOnOwner
        ? Object.values(posts).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
              String(b._id).localeCompare(String(a._id))
          )
        : [],
    [posts, isStoreOnOwner]
  );

  return {
    status,
    channels,
    sortedPosts,
    loadFirstPage,
    loadMore,
    loadingMore,
    moreFailed,
    sentinel,
    newPostsCount: newPosts.length,
    showNewPosts,
    merging,
    newlyAddedIds,
  };
}
