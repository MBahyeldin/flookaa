import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowUp, Compass, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import InterestFilter from "@/components/interests/InterestFilter";
import { interestNamesLabel, useInterestParams } from "@/components/interests/useInterestParams";
import { Masonry } from "@/components/masonry";
import { MasonryTile, SkeletonTile } from "@/components/masonry-tile";
import { tileContent } from "@/components/masonry-tile/tileContent";
import {
  GetDiscoverDocument,
  type GetDiscoverQuery,
  type GetDiscoverQueryVariables,
  type Post,
} from "@/generated/graphql";
import client from "@/graphql/client";
import { useWebsocketService } from "@/Websocket.context";
import { useChannelPostsPager } from "@/hooks/useChannelPostsPager";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { MessageListener } from "@/ws";

const PAGE_SIZE = 20;

export default function DiscoverPage() {
  const personaId = useUserProfileStore((s) => s.persona?.id);
  const { interests, setInterests, searchParams } = useInterestParams();
  const all = interests.length === 0 && searchParams.get("all") === "1";
  const [interestNames, setInterestNames] = useState<string[]>([]);
  const [mine, setMine] = useState<number[] | null>(null);

  // No interests picked means All on Discover; For you is the bare URL.
  const pickInterests = (slugs: string[]) =>
    setInterests(slugs, (next) => (slugs.length ? next.delete("all") : next.set("all", "1")));
  const showForYou = () => setInterests([], (next) => next.delete("all"));

  if (!personaId) return null;

  const mode = all ? "all" : interests.join(",");
  return (
    <div className="mx-auto w-full max-w-[1192px] px-4 py-8 sm:px-6 lg:px-16">
      <header className="mb-8 flex flex-col gap-2">
        <h1>Discover</h1>
        <p className="text-muted-foreground">
          {interests.length && interestNames.length
            ? `Posts from public channels about ${interestNamesLabel(interestNames)}.`
            : all
              ? "Posts from public channels you're not in yet."
              : "Posts from public channels that share your interests."}
        </p>
      </header>
      <div className="mb-8">
        <InterestFilter
          value={interests}
          onChange={pickInterests}
          onSelectedNames={setInterestNames}
          onMineLoaded={setMine}
          forYou={{ selected: !all && interests.length === 0, onSelect: showForYou }}
        />
      </div>
      {/* Each mode is its own list and subscription. */}
      <DiscoverView
        key={`${personaId}:${mode}`}
        personaId={String(personaId)}
        mode={mode}
        interestNames={interestNames}
        hasInterests={mine === null ? null : mine.length > 0}
        onShowForYou={showForYou}
      />
    </div>
  );
}

function DiscoverView({
  personaId,
  mode,
  interestNames,
  hasInterests,
  onShowForYou,
}: {
  personaId: string;
  // "" = For you, "all", or the picked slugs joined by commas.
  mode: string;
  interestNames: string[];
  hasInterests: boolean | null;
  onShowForYou: () => void;
}) {
  const { websocketService } = useWebsocketService();
  const topRef = useRef<HTMLDivElement>(null);
  const owner = useMemo(() => ({ id: `${personaId}:${mode}`, type: "DISCOVER" as const }), [personaId, mode]);
  const filter = useMemo(
    () => ({ all: mode === "all", interests: mode && mode !== "all" ? mode.split(",") : [] }),
    [mode]
  );
  const fetchPage = useCallback(
    async (variables: { after?: string; limit: number }) => {
      const { data } = await client.query<GetDiscoverQuery, GetDiscoverQueryVariables>({
        query: GetDiscoverDocument,
        variables: { ...variables, ...filter },
        fetchPolicy: "no-cache",
      });
      if (!data) throw new Error("empty discover response");
      return data.getDiscover;
    },
    [filter]
  );
  const subscribe = useCallback(
    (callback: MessageListener) => websocketService!.subscribeToDiscoverEvents(filter, callback),
    [websocketService, filter]
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
  } = useChannelPostsPager({
    owner,
    pageSize: PAGE_SIZE,
    fetchPage,
    subscribe: websocketService ? subscribe : undefined,
    // New posts belong at the top, which masonry can't insert without moving everything.
    mergeNew: false,
  });

  const getKey = useCallback((post: Post) => post._id, []);
  const estimateHeight = useCallback((post: Post) => (tileContent(post.rawContent).image ? 440 : 220), []);
  const render = useCallback(
    (post: Post) => <MasonryTile post={post} channel={channels[String(post.owner.id)]} />,
    [channels]
  );

  const onShowNewPosts = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    showNewPosts();
  };

  let body;
  if (status === "loading") {
    body = (
      <div role="status" className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <span className="sr-only">Loading…</span>
        {[true, false, true, false].map((tall, i) => (
          <SkeletonTile key={i} tall={tall} />
        ))}
      </div>
    );
  } else if (status === "error") {
    body = <ErrorState title="Couldn't load Discover" onRetry={loadFirstPage} />;
  } else if (sortedPosts.length === 0 && newPostsCount === 0) {
    if (!mode && hasInterests === false) {
      body = (
        <EmptyState
          icon={Sparkles}
          title="Pick your interests"
          body="Discover shows posts from public channels that share an interest with you."
          action={
            <Button asChild>
              <Link to={`/persona-manager/${personaId}`}>Choose interests</Link>
            </Button>
          }
        />
      );
    } else if (filter.interests.length) {
      body = (
        <EmptyState
          icon={Compass}
          title={
            interestNames.length
              ? `No public posts about ${interestNamesLabel(interestNames)} yet`
              : "No public posts about these yet"
          }
          body="Channels you're already in show up in your feed instead."
          action={<Button onClick={onShowForYou}>Show For you</Button>}
        />
      );
    } else {
      body = (
        <EmptyState
          icon={Compass}
          title="Nothing new yet"
          body={
            filter.all
              ? "No public channel you're not in has posted yet."
              : "No public channel you're not in has posted about your interests."
          }
          action={
            <Button asChild>
              <Link to="/channels">Browse channels</Link>
            </Button>
          }
        />
      );
    }
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <Masonry items={sortedPosts} getKey={getKey} estimateHeight={estimateHeight} render={render} />
        {loadingMore && (
          <div role="status" className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <span className="sr-only">Loading…</span>
            {[false, true, false, true].map((tall, i) => (
              <SkeletonTile key={i} tall={tall} />
            ))}
          </div>
        )}
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
    <div ref={topRef} className="scroll-mt-8">
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
