import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Post } from "@/components/post-card";
import {
  GetCommunityFeedDocument,
  type GetCommunityFeedQuery,
  type GetCommunityFeedQueryVariables,
} from "@/generated/graphql";
import client from "@/graphql/client";
import { useWebsocketService } from "@/Websocket.context";
import { useChannelPostsPager } from "@/hooks/useChannelPostsPager";
import type { MessageListener } from "@/ws";

const PAGE_SIZE = 6;

export function CommunityLatest({ communityId, className }: { communityId: number; className?: string }) {
  const { t } = useTranslation(["communities", "posts", "common"]);
  const navigate = useNavigate();
  const { websocketService } = useWebsocketService();
  const topRef = useRef<HTMLElement>(null);
  const owner = useMemo(() => ({ id: String(communityId), type: "COMMUNITY_FEED" as const }), [communityId]);
  const fetchPage = useCallback(
    async (variables: { after?: string; limit: number }) => {
      const { data } = await client.query<GetCommunityFeedQuery, GetCommunityFeedQueryVariables>({
        query: GetCommunityFeedDocument,
        variables: { communityId, ...variables },
        fetchPolicy: "no-cache",
      });
      if (!data) throw new Error("empty community feed response");
      return data.getCommunityFeed;
    },
    [communityId]
  );
  const subscribe = useCallback(
    (callback: MessageListener) => websocketService!.subscribeToCommunityFeedEvents(communityId, callback),
    [websocketService, communityId]
  );
  const {
    status,
    channels,
    sortedPosts,
    loadFirstPage,
    loadMore,
    loadingMore,
    moreFailed,
    hasMore,
    newPostsCount,
    showNewPosts,
    merging,
    newlyAddedIds,
  } = useChannelPostsPager({
    owner,
    pageSize: PAGE_SIZE,
    fetchPage,
    subscribe: websocketService ? subscribe : undefined,
  });

  const onShowNewPosts = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    showNewPosts();
  };

  let body;
  if (status === "loading") {
    body = <SkeletonList count={2} variant="post" className="flex flex-col gap-6" />;
  } else if (status === "error") {
    body = <ErrorState title={t("latest.loadFailed")} onRetry={loadFirstPage} />;
  } else if (sortedPosts.length === 0 && newPostsCount === 0) {
    body = <EmptyState icon={Newspaper} title={t("latest.empty")} />;
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
        {moreFailed ? (
          <div role="alert" className="flex items-center gap-3 text-sm text-muted-foreground">
            {t("posts:loadMoreFailedShort")}
            <Button variant="outline" size="sm" onClick={loadMore}>
              {t("common:actions.retry")}
            </Button>
          </div>
        ) : hasMore ? (
          <Button variant="outline" className="self-start max-sm:w-full" loading={loadingMore} onClick={loadMore}>
            {t("latest.showMore")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <section
      ref={topRef}
      id="latest"
      aria-labelledby="community-latest"
      className={`flex max-w-[640px] flex-col gap-6 ${className ?? ""}`}
    >
      <SectionHeader
        overline={t("latest.overline")}
        title={<span id="community-latest">{t("latest.title")}</span>}
      />
      {newPostsCount > 0 && status === "ready" ? (
        <div className="sticky top-28 z-10 flex justify-center md:top-16">
          <Button size="sm" className="rounded-full shadow-sm" loading={merging} onClick={onShowNewPosts}>
            <ArrowUp />
            {t("posts:newPosts", { count: newPostsCount })}
          </Button>
        </div>
      ) : null}
      {body}
    </section>
  );
}
