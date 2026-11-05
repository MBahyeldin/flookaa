import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, EyeOff } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Post } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  GetSavedDocument,
  UnsavePostDocument,
  type FeedChannel,
  type GetSavedQuery,
  type GetSavedQueryVariables,
  type Post as PostType,
} from "@/generated/graphql";
import client from "@/graphql/client";
import { t } from "@/i18n";
import { isCurrentOwner, useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useWebsocketService } from "@/Websocket.context";
import type { SavedPayload } from "@/types/Ws";

const PAGE_SIZE = 10;
// The default subscription replays on connect; one refetch covers the burst.
const REFRESH_DELAY = 300;

type SavedPage = GetSavedQuery["getSaved"];
type Item = { postId: string; unavailable: boolean };

async function fetchSaved(variables: GetSavedQueryVariables) {
  const { data } = await client.query<GetSavedQuery, GetSavedQueryVariables>({
    query: GetSavedDocument,
    variables,
    fetchPolicy: "no-cache",
  });
  if (!data) throw new Error("empty saved response");
  return data.getSaved;
}

const toItems = (page: SavedPage): Item[] =>
  page.items.map((item) => ({ postId: item.postId, unavailable: !item.post }));

export default function SavedPage() {
  const personaId = useUserProfileStore((s) => s.persona?.id);
  return personaId ? <SavedView key={personaId} personaId={String(personaId)} /> : null;
}

function SavedView({ personaId }: { personaId: string }) {
  const navigate = useNavigate();
  const { websocketService } = useWebsocketService();
  const owner = useMemo(() => ({ id: personaId, type: "SAVED" as const }), [personaId]);
  const setOwner = useAppStore((s) => s.setOwner);
  const resetPage = useAppStore((s) => s.resetPage);
  const addPosts = useAppStore((s) => s.addPosts);
  const posts = useAppStore((s) => s.posts);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<Item[]>([]);
  const [channels, setChannels] = useState<Record<string, FeedChannel>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const addPage = useCallback(
    (page: SavedPage) => {
      addPosts(page.items.flatMap((item) => (item.post ? [item.post as PostType] : [])));
      setChannels((prev) => {
        const next = { ...prev };
        for (const channel of page.channels) next[String(channel.id)] = channel;
        return next;
      });
    },
    [addPosts]
  );

  const loadFirstPage = useCallback(async () => {
    setStatus("loading");
    try {
      const page = await fetchSaved({ limit: PAGE_SIZE });
      if (!isCurrentOwner(owner)) return;
      addPage(page);
      setItems(toItems(page));
      setCursor(page.nextCursor ?? null);
      setStatus("ready");
    } catch {
      if (isCurrentOwner(owner)) setStatus("error");
    }
  }, [owner, addPage]);

  useEffect(() => {
    setOwner(owner);
    loadFirstPage();
    return () => resetPage();
  }, [owner, setOwner, resetPage, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await fetchSaved({ after: cursor, limit: PAGE_SIZE });
      if (!isCurrentOwner(owner)) return;
      addPage(page);
      setItems((prev) => {
        const known = new Set(prev.map((item) => item.postId));
        return [...prev, ...toItems(page).filter((item) => !known.has(item.postId))];
      });
      setCursor(page.nextCursor ?? null);
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, owner, addPage]);

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

  // Puts a post saved elsewhere on top without moving what's already loaded.
  const refresh = useCallback(async () => {
    try {
      const page = await fetchSaved({ limit: PAGE_SIZE });
      if (!isCurrentOwner(owner)) return;
      addPage(page);
      setItems((prev) => {
        const fresh = toItems(page);
        const known = new Set(fresh.map((item) => item.postId));
        return [...fresh, ...prev.filter((item) => !known.has(item.postId))];
      });
      setCursor((prev) => prev ?? page.nextCursor ?? null);
    } catch {
      // The list is only behind until the next load.
    }
  }, [owner, addPage]);

  useEffect(() => {
    if (!websocketService) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = websocketService.subscribeToDefaultEvents((message) => {
      if (message.event?.name !== "saved") return;
      if (message.event.action === "delete") {
        const { post_id } = message.payload as SavedPayload;
        setItems((prev) => prev.filter((item) => !(item.postId === post_id && item.unavailable)));
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(refresh, REFRESH_DELAY);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [websocketService, refresh]);

  // Unsaving flips the post in the store, which takes its card out here.
  const visible = items.filter((item) => item.unavailable || posts[item.postId]?.personalizedMeta?.savedByPersona);

  let body;
  if (status === "loading") {
    body = <SkeletonList count={3} variant="post" className="flex flex-col gap-6" />;
  } else if (status === "error") {
    body = <ErrorState title={t("posts:savedPage.loadFailed")} onRetry={loadFirstPage} />;
  } else if (visible.length === 0 && !cursor) {
    body = (
      <EmptyState icon={Bookmark} title={t("posts:savedPage.emptyTitle")} body={t("posts:savedPage.emptyBody")} />
    );
  } else {
    body = (
      <div className="flex flex-col gap-6">
        {visible.map((item) => {
          const post = posts[item.postId];
          if (item.unavailable || !post) {
            return (
              <UnavailableRow
                key={item.postId}
                postId={item.postId}
                onRemoved={() => setItems((prev) => prev.filter((other) => other.postId !== item.postId))}
              />
            );
          }
          const channel = post.owner.type === "CHANNEL" ? channels[String(post.owner.id)] : undefined;
          const href =
            post.owner.type === "PERSONA"
              ? `/personas/${post.owner.id}/posts/${post._id}`
              : `/channels/${post.owner.id}/posts/${post._id}`;
          return (
            <Post
              key={post._id}
              post={post}
              version="spine"
              channel={channel ? { id: channel.id, name: channel.name, theme: channel.theme } : undefined}
              canModerate={channel?.canModerate ?? false}
              onOpen={() => navigate(href)}
            />
          );
        })}
        {loadingMore && <SkeletonList count={2} variant="post" className="flex flex-col gap-6" />}
        {moreFailed && (
          <div role="alert" className="flex items-center justify-center gap-3 py-4 text-sm text-muted-foreground">
            {t("posts:loadMoreFailedShort")}
            <Button variant="outline" size="sm" onClick={loadMore}>
              {t("common:actions.retry")}
            </Button>
          </div>
        )}
        <div ref={sentinel} aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1>{t("posts:savedPage.title")}</h1>
        <p className="text-muted-foreground">{t("posts:savedPage.lead")}</p>
      </header>
      {body}
    </div>
  );
}

function UnavailableRow({ postId, onRemoved }: { postId: string; onRemoved: () => void }) {
  const [unsavePost, { loading }] = useMutation(UnsavePostDocument);

  const remove = async () => {
    try {
      await unsavePost({ variables: { id: postId } });
      onRemoved();
    } catch {
      toast.error(t("posts:save.failed"));
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-sunken py-2 ps-4 pe-2 text-sm text-muted-foreground">
      <EyeOff aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{t("posts:savedPage.unavailable")}</span>
      <Button variant="ghost" size="sm" className="text-foreground" loading={loading} onClick={remove}>
        {t("posts:savedPage.remove")}
      </Button>
    </div>
  );
}
