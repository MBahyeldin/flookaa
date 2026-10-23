import { useEffect, useMemo, useState } from "react";
import { Lock, MessageSquare } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SectionNav, SectionNavContent, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import NotFound from "@/components/not-found";
import { Post } from "@/components/post-card";
import { useGetChannelCommunityLazyQuery, useGetChannelQuery, useGetPostsLazyQuery } from "@/generated/graphql";
import { getChannelInterests, joinChannel, leaveChannel, setFollowing } from "@/services/channels";
import type { Interest } from "@/types/interest";
import { useWebsocketService } from "@/Websocket.context";
import loadNewPosts from "./subscribe/loadNewPosts";
import handleChannelEvents from "./subscribe/handleChannelEvents";
import type { ChannelEventPayload, PostEventPayload, WsEventMessage } from "@/types/Ws";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { isCurrentOwner, useAppStore } from "@/stores/AppStore";
import ModerationSheet from "./ModerationSheet";
import PostDialog from "./PostDialog";
import { ChannelHero } from "./ChannelHero";
import { ChannelAbout } from "./ChannelAbout";
import { ChannelPeople } from "./ChannelPeople";
import { ComposerBar } from "./ComposerBar";

const TABS = ["posts", "about", "people"] as const;
type Tab = (typeof TABS)[number];

export default function ChannelPage() {
  const { id: channelId } = useParams<{ id: string }>();
  // React Router keeps this component mounted when only :id changes, so the
  // paging offset, pending new-post notices and join state carried over to
  // the next channel. Keying on the id gives each channel a fresh view.
  return <ChannelView key={channelId} channelId={channelId} />;
}

function ChannelView({ channelId }: { channelId: string | undefined }) {
  const {
    data: channelData,
    loading: channelLoading,
    error: channelError,
    refetch: refetchChannel,
  } = useGetChannelQuery({
    variables: { id: channelId },
  });
  const { websocketService } = useWebsocketService();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isJoined, setIsJoined] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState<"join" | "follow" | null>(null);
  const [peopleVersion, setPeopleVersion] = useState(0);

  const [newPosts, setNewPosts] = useState<PostEventPayload[]>([]);
  const [isManaging, setIsManaging] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [interestsVersion, setInterestsVersion] = useState(0);
  // Set once the community changes live; not cached, so the posts query isn't touched.
  const [communityOverride, setCommunityOverride] = useState<{ id: number; name: string; slug: string } | null | undefined>(undefined);
  const [communityKey, setCommunityKey] = useState(0);
  const [fetchCommunity] = useGetChannelCommunityLazyQuery({ fetchPolicy: "no-cache" });
  const [membersCount, setMembersCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const canModerate = channelData?.getChannel?.canModerate || false;

  const setOwner = useAppStore((state) => state.setOwner);
  const resetPage = useAppStore((state) => state.resetPage);
  const addPosts = useAppStore((state) => state.addPosts);
  const setCanModerate = useAppStore((state) => state.setCanModerate);
  const posts = useAppStore((s) => s.posts);
  const storeOwner = useAppStore((s) => s.owner);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadMorePosts] = useGetPostsLazyQuery();

  const pageOwner = useMemo(
    () => ({ id: channelId ?? "", type: "CHANNEL" as const }),
    [channelId]
  );
  // The first render after switching channels happens before the effect below
  // points the store at this channel; until then the store still holds the
  // previous page, so its posts must not be shown here.
  const isStoreOnThisChannel =
    storeOwner?.type === "CHANNEL" && String(storeOwner.id) === channelId;

  // Point the store at this channel (clearing any other page's posts and
  // comments), and clear it again on leave. Declared before the effect that
  // adds the channel's posts, so the reset always lands first.
  useEffect(() => {
    if (!channelId) return;
    setOwner(pageOwner);
    return () => resetPage();
  }, [channelId, pageOwner, setOwner, resetPage]);

  const handleLoadMorePosts = async () => {
    if (!channelId) return;
    setLoadingMore(true);
    const { data, error } = await loadMorePosts({
      variables: {
        owner: {
          id: channelId,
          type: "CHANNEL",
        },
        limit: 10,
        offset,
      },
    }).catch((error: Error) => ({ data: undefined, error }));
    setLoadingMore(false);
    // The user may have switched channels while this was in flight.
    if (!isCurrentOwner(pageOwner)) return;
    if (error) {
      toast.error("Couldn't load more posts");
      return;
    }
    if (data?.getPosts) {
      addPosts(data.getPosts);
      if (data.getPosts.length < 10 || (channelData?.getChannel?.totalPosts || 0) <= offset + data.getPosts.length) {
        setShowLoadMore(false);
      }
    }
    setOffset(offset + 10);
  };

  // useMemo ensures no infinite loops
  const sortedPosts = useMemo(
    () =>
      isStoreOnThisChannel
        ? Object.values(posts).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : [],
    [posts, isStoreOnThisChannel]
  );

  // No success toasts: the button state is the feedback.
  const handleJoin = async () => {
    if (!channelId || busy) return;
    const name = channelData?.getChannel?.name ?? "this channel";
    if (isJoined && !confirm(`Leave ${name}?`)) return;
    setBusy("join");
    // Leaving also cancels a pending request.
    if (isJoined || isPending) {
      const error = await leaveChannel(channelId);
      setBusy(null);
      if (error) return toast.error(error.message);
      // A cancelled request was never counted.
      if (isJoined) setMembersCount((n) => Math.max(0, n - 1));
      setIsJoined(false);
      setIsPending(false);
      return;
    }
    const result = await joinChannel(channelId);
    setBusy(null);
    if (result.error) return toast.error(result.error.message);
    if (result.status === "pending") {
      setIsPending(true);
      return;
    }
    setMembersCount((n) => n + 1);
    setIsJoined(true);
  };

  const handleFollow = async () => {
    if (!channelId || busy) return;
    const next = !isFollowing;
    setBusy("follow");
    const error = await setFollowing(channelId, next);
    setBusy(null);
    if (error) return toast.error(error.message);
    setIsFollowing(next);
    setFollowersCount((n) => Math.max(0, n + (next ? 1 : -1)));
  };

  /*
   * Ids of posts that arrived over the websocket after this feed rendered, so
   * the cards can play their entrance animation. Cleared on a timer that
   * outlasts the animation — otherwise the class would stick and the post
   * would replay it on every later re-render.
   */
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  const handleLoadNewPosts = () => {
    const arrivingIds = newPosts.map((p) => p.object_id);
    setNewPosts([]);
    setNewlyAddedIds(new Set(arrivingIds));
    loadNewPosts({ newPosts });
  };

  useEffect(() => {
    if (newlyAddedIds.size === 0) return;
    const timer = setTimeout(() => setNewlyAddedIds(new Set()), 2200);
    return () => clearTimeout(timer);
  }, [newlyAddedIds]);

  useEffect(() => {
    if (!channelId) return;
    let alive = true;
    getChannelInterests(channelId).then((r) => {
      if (alive && r.ok) setInterests(r.data.interests);
    });
    return () => {
      alive = false;
    };
  }, [channelId, interestsVersion]);

  useEffect(() => {
    if (!channelId || communityKey === 0) return;
    let alive = true;
    fetchCommunity({ variables: { id: channelId } }).then((r) => {
      if (alive && r.data?.getChannel) setCommunityOverride(r.data.getChannel.community ?? null);
    });
    return () => {
      alive = false;
    };
  }, [channelId, communityKey, fetchCommunity]);

  useEffect(() => {
    if (!websocketService || !channelId) return;

    /*
     * Membership changes from other personas. Our own actions (actor_id is
     * us) already updated this view when the request succeeded, so applying
     * them again would count them twice.
     */
    const onMembershipEvent = (
      event: WsEventMessage["event"],
      payload: ChannelEventPayload
    ) => {
      const me = useUserProfileStore.getState().persona?.id;
      if (event.name === "member") setPeopleVersion((v) => v + 1);
      if (me != null && Number(event.actor_id) === Number(me)) return;
      const isMe = me != null && Number(payload.persona_id) === Number(me);
      const delta = event.action === "create" ? 1 : event.action === "delete" ? -1 : 0;

      switch (event.name) {
        case "member":
          setMembersCount((n) => Math.max(0, n + delta));
          if (isMe && payload.reason === "approved") {
            setIsJoined(true);
            setIsPending(false);
            // The posts weren't readable before.
            refetchChannel();
          }
          if (isMe && payload.reason === "removed") {
            setIsJoined(false);
            toast.info("You were removed from this channel.");
          }
          break;
        case "follower":
          setFollowersCount((n) => Math.max(0, n + delta));
          break;
        case "join_request":
          if (isMe && event.action === "delete" && payload.reason === "rejected") setIsPending(false);
          break;
      }
    };

    // subscribe
    const unsubscribe = websocketService.subscribeToChannelEvents(
      Number(channelId),
      handleChannelEvents({
        setNewPosts,
        onMembershipEvent,
        onInterestsChanged: () => setInterestsVersion((v) => v + 1),
        onCommunityChanged: () => setCommunityKey((k) => k + 1),
        // An age limit the viewer no longer meets turns the page into "not found".
        onInfoChanged: () => refetchChannel(),
      })
    );

    // cleanup on unmount or channelId change
    return () => {
      unsubscribe?.();
    };
  }, [websocketService, channelId, refetchChannel]);

  useEffect(() => {
    addPosts(channelData?.getChannel?.posts || []);
    setOffset(10);
    if ((channelData?.getChannel?.totalPosts || 0) > (channelData?.getChannel?.posts.length || 0)) {
      setShowLoadMore(true);
    } else {
      setShowLoadMore(false);
    }
  }, [channelData, addPosts]);

  // Server state wins on every (re)load; actions and events adjust it in between.
  useEffect(() => {
    setIsJoined(channelData?.getChannel?.isMember || false);
    setIsPending(channelData?.getChannel?.isPending || false);
    setIsFollowing(channelData?.getChannel?.isFollower || false);
    setMembersCount(channelData?.getChannel?.membersCount ?? 0);
    setFollowersCount(channelData?.getChannel?.followersCount ?? 0);
    // Lets post and comment menus offer Delete on other personas' content.
    setCanModerate(channelData?.getChannel?.canModerate || false);
  }, [channelData, setCanModerate]);


  // Refetches (info.update, approval) keep the page instead of flashing the skeleton.
  if (channelLoading && !channelData) return <ChannelSkeleton />;

  if (channelError || !channelData?.getChannel) {
    const isMissing = !channelError || channelError.message.includes("channel not found");
    if (isMissing) return <NotFound />;
    return (
      <ErrorState
        className="mx-4 mt-24"
        title="Couldn't load this channel"
        onRetry={() => refetchChannel()}
      />
    );
  }

  const channel = channelData.getChannel;
  const community = communityOverride !== undefined ? communityOverride : channel.community;
  const canRead = !channel.isPrivate || isJoined;
  const tab = TABS.includes(searchParams.get("tab") as Tab) ? (searchParams.get("tab") as Tab) : "posts";
  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "posts") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params);
  };

  const postChannel = { id: channel.id, name: channel.name, theme: channel.theme };
  const openPost = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("post", id);
    setSearchParams(params);
  };

  const membersOnly = (
    <EmptyState
      icon={Lock}
      title="Members only"
      body="Join to read and post here."
      action={
        !isPending && (
          <Button onClick={handleJoin} loading={busy === "join"}>
            Request to join
          </Button>
        )
      }
    />
  );

  return (
    <div data-theme={channel.theme} className="min-h-full bg-background text-foreground">
      <ChannelHero
        channel={channel}
        community={community}
        membersCount={membersCount}
        followersCount={followersCount}
        isJoined={isJoined}
        isPending={isPending}
        isFollowing={isFollowing}
        busy={busy}
        canModerate={canModerate}
        onJoin={handleJoin}
        onFollow={handleFollow}
        onManage={() => setIsManaging(true)}
      />

      {canModerate && channelId && (
        <ModerationSheet
          channelId={channelId}
          open={isManaging}
          onOpenChange={setIsManaging}
          onInterestsSaved={setInterests}
          communityKey={communityKey}
          minAge={channel.minAge}
          onMinAgeSaved={() => refetchChannel()}
        />
      )}

      <SectionNav value={tab} onValueChange={setTab}>
        <SectionNavList className="top-14 px-4 md:top-0 md:px-8 xl:px-16">
          <SectionNavTab value="posts">Posts</SectionNavTab>
          <SectionNavTab value="about">About</SectionNavTab>
          <SectionNavTab value="people">People</SectionNavTab>
        </SectionNavList>

        <div className="mx-auto w-full max-w-[1192px] px-4 py-6 md:px-8 md:py-8 xl:px-16">
          <SectionNavContent value="posts" className="flex flex-col gap-6">
            {!canRead ? (
              membersOnly
            ) : (
              <>
                {isJoined && <ComposerBar channelName={channel.name} />}

                {newPosts.length ? (
                  <button
                    type="button"
                    onClick={handleLoadNewPosts}
                    className="w-full cursor-pointer rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-center text-sm font-medium text-success transition-colors hover:bg-success/20"
                  >
                    {newPosts.length} new post{newPosts.length > 1 ? "s" : ""} available
                  </button>
                ) : null}

                {!isStoreOnThisChannel ? null : sortedPosts.length ? (
                  sortedPosts.map((post) => (
                    <Post
                      key={post._id}
                      post={post}
                      version="canvas"
                      channel={postChannel}
                      onOpen={() => openPost(post._id)}
                      isNew={newlyAddedIds.has(post._id)}
                    />
                  ))
                ) : (
                  <EmptyState icon={MessageSquare} title="No posts yet" body={`Be the first to post in ${channel.name}.`} />
                )}

                {loadingMore && <SkeletonList count={2} variant="post" className="space-y-6" />}
                {showLoadMore && !loadingMore && (
                  <div className="text-center">
                    <Button variant="outline" size="lg" className="px-8" onClick={handleLoadMorePosts}>
                      Load more posts
                    </Button>
                  </div>
                )}
              </>
            )}
          </SectionNavContent>

          <SectionNavContent value="about">
            <ChannelAbout
              description={channel.description}
              interests={interests}
              isPrivate={channel.isPrivate}
              minAge={channel.minAge}
              createdAt={channel.createdAt}
              owner={channel.owner}
              community={community}
            />
          </SectionNavContent>

          <SectionNavContent value="people">
            {canRead && channelId ? <ChannelPeople channelId={channelId} version={peopleVersion} /> : membersOnly}
          </SectionNavContent>
        </div>
      </SectionNav>

      {/* ?post=<id> from a notification */}
      <PostDialog channel={postChannel} channelId={channelId} isStoreOnThisChannel={isStoreOnThisChannel} />
    </div>
  );
}

function ChannelSkeleton() {
  return (
    <div role="status" aria-label="Loading channel" className="pb-8">
      <Skeleton className="h-[150px] rounded-none md:h-[280px]" />
      <div className="-mt-10 flex flex-col gap-3 px-4 md:-mt-14 md:px-8 xl:px-16">
        <Skeleton className="size-20 rounded-lg border-3 border-background md:size-28" />
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
    </div>
  );
}
