import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Heart,
  Share2,
  Settings,
  UserPlus,
  HeartOff,
  // Bell,
  // BellOff,
  User2,
} from "lucide-react";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Post } from "@/components/post-card";
import { Link, useParams } from "react-router-dom";
import { useGetChannelQuery, useGetPostsLazyQuery } from "@/generated/graphql";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCreator } from "@/components/post-creator";
import { joinChannel, leaveChannel } from "@/services/channels";
import { toast } from "sonner";
import { useWebsocketService } from "@/Websocket.context";
import loadNewPosts from "./subscribe/loadNewPosts";
import handleChannelEvents from "./subscribe/handleChannelEvents";
import type { PostEventPayload } from "@/types/Ws";
import { useAppStore } from "@/stores/AppStore";
import { formatDateOnly } from "@/utils/formateDate";

export default function ChannelPage() {
  const { id: channelId } = useParams<{ id: string }>();
  const {
    data: channelData,
    loading: channelLoading,
    error: channelError,
  } = useGetChannelQuery({
    variables: { id: channelId },
  });
  const { websocketService } = useWebsocketService();
  const [isJoined, setIsJoined] = useState(
    channelData?.getChannel?.isMember || false
  );
  const [isFollowing, setIsFollowing] = useState(
    channelData?.getChannel?.isFollower || false
  );

  const [newPosts, setNewPosts] = useState<PostEventPayload[]>([]);

  const setOwner = useAppStore((state) => state.setOwner);
  const addPosts = useAppStore((state) => state.addPosts);
  const posts = useAppStore((s) => s.posts);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadMorePosts] = useGetPostsLazyQuery();

  const handleLoadMorePosts = async () => {
    if (!channelId) return;
    const { data } = await loadMorePosts({
      variables: {
        owner: {
          id: channelId,
          type: "CHANNEL",
        },
        limit: 10,
        offset,
      },
    });
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
      Object.values(posts).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [posts]
  );

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channelId) return;
    const error = isJoined
      ? await leaveChannel(channelId)
      : await joinChannel(channelId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Successfully ${isJoined ? "left" : "joined"} channel`);
    setIsJoined(!isJoined);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
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
    if (!websocketService || !channelId) return;

    // set the owner in the app store
    setOwner({
      "id": channelId,
      "type": "CHANNEL"
    });

    // subscribe
    const unsubscribe = websocketService.subscribeToChannelEvents(
      Number(channelId),
      handleChannelEvents({
        setNewPosts,
      })
    );

    // cleanup on unmount or channelId change
    return () => {
      unsubscribe?.();
    };
  }, [websocketService, channelId, setOwner]);

  useEffect(() => {
    addPosts(channelData?.getChannel?.posts || []);
    setOffset(10);
    if ((channelData?.getChannel?.totalPosts || 0) > (channelData?.getChannel?.posts.length || 0)) {
      setShowLoadMore(true);
    } else {
      setShowLoadMore(false);
    }
  }, [channelData, addPosts]);  


  // Loading, failed and missing are three different things — collapsing them
  // into one "Loading channel..." left errors looking like an indefinite hang.
  if (channelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground" role="status">
          Loading channel…
        </p>
      </div>
    );
  }

  if (channelError || !channelData?.getChannel) {
    const isMissing = !channelError;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4" role="alert">
          <h1 className="text-2xl font-bold">
            {isMissing ? "Channel not found" : "Couldn’t load this channel"}
          </h1>
          <p className="text-muted-foreground">
            {isMissing
              ? "This channel may have been deleted, or you may not have access to it."
              : channelError?.message ||
                "Something went wrong while loading this channel. Please try again."}
          </p>
          <Button asChild variant="outline">
            <Link to="/channels">Back to Channels</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/*
          Replaces a standalone "Back to Channels" ghost button. That button
          consumed a full row above the hero, was the only back affordance in
          the app, duplicated the sidebar's own Channels link, and was
          mislabelled: it always routed to /channels regardless of where the
          user actually came from, so "Back" was inaccurate.

          A breadcrumb states the hierarchy, offers the same one-tap way up,
          and costs one compact line.
        */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                {/* py/-my expands the tap area to 44px without moving the
                    row: the bare text link was only 20px tall. */}
                <Link to="/channels" className="inline-flex items-center py-3 -my-3">
                  Channels
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{channelData.getChannel.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {/* Channel Header */}
        {/*
          py-0 gap-0: shadcn's Card ships `py-6 gap-6`, which put 24px of card
          background above the banner — the stray white strip before the image.
          The banner is meant to sit flush against the card's top edge, and
          CardContent below supplies its own padding.
        */}
        <Card className="mb-8 border-0 shadow-sm overflow-hidden py-0 gap-0">
          {/* Banner Image */}
          <div className="relative h-40 sm:h-52 overflow-hidden">
            <ImageWithFallback
              src={channelData.getChannel.bannerImageUrl || ""}
              alt={`${channelData.getChannel.name} banner`}
              className="w-full h-full object-cover"
            />
            {/* Navy scrim rather than flat black, so the banner sits in the
                same colour family as the rest of the theme. It also keeps the
                thumbnail readable against a busy photo. */}
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.22_0.05_258)]/80 via-[oklch(0.22_0.05_258)]/25 to-transparent" />
          </div>

          <CardContent className="p-4 sm:p-6">
            {/* Smaller overlap on mobile so the thumbnail doesn't eat the banner */}
            <div className="relative -mt-12 sm:-mt-16 mb-5 sm:mb-6">
              <div className="flex items-end gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <ImageWithFallback
                    src={channelData.getChannel.thumbnailUrl || ""}
                    alt=""
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-card object-cover shadow-md"
                  />
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-card-foreground">
                      {channelData.getChannel.name}
                    </h1>
                    {/* The literal "category" badge was removed: Channel has no
                        category field in the schema, so it was always a stub. */}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Channel Description */}
              <p className="text-muted-foreground leading-relaxed">
                {channelData.getChannel.description}
              </p>

              {/* Channel Stats — flex-wrap so these don't overflow on mobile */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {channelData.getChannel.membersCount ?? 0}
                  </span>
                  <span className="text-muted-foreground">members</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {channelData.getChannel.followersCount ?? 0}
                  </span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                {channelData.getChannel.createdAt && (
                  <div className="text-muted-foreground">
                    Created on{" "}
                    <time dateTime={channelData.getChannel.createdAt}>
                      {formatDateOnly(channelData.getChannel.createdAt)}
                    </time>
                  </div>
                )}

                {/*
                  The owner used to sit in its own filled p-4 box with a 40px
                  avatar, a bold name and a badge — as visually heavy as the
                  CTA row, for attribution nobody comes to this page for. It's
                  now one muted item in the metadata line: same information,
                  proportionate weight.
                */}
                <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <span>by</span>
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage
                      src={channelData.getChannel.owner.profileImageUrl || ""}
                    />
                    <AvatarFallback>
                      <User2 className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-foreground">
                    {channelData.getChannel.owner.username}
                  </span>
                </div>
              </div>

              {/* Action Buttons — flex-wrap so they don't clip on mobile.
                  gap-2 at phone width: at gap-3 the four buttons totalled ~349px
                  against 343px available, so the last one wrapped on its own. */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  onClick={handleJoin}
                  variant={isJoined ? "secondary" : "default"}
                  className="flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {/* Measured: the four buttons need 341px but only 311px is
                      available at 375px. Shortening just this label to "Join"
                      on phones brings the row to ~275px so it fits on one line;
                      the full wording returns from sm: up. */}
                  <span className="sm:hidden">{isJoined ? "Joined" : "Join"}</span>
                  <span className="hidden sm:inline">
                    {isJoined ? "Joined" : "Join Channel"}
                  </span>
                </Button>

                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "secondary" : "outline"}
                  className="flex items-center space-x-2"
                >
                  {isFollowing ? (
                    <HeartOff className="h-4 w-4" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                  <span>{isFollowing ? "Following" : "Follow"}</span>
                </Button>
                {/* 
                <Button
                  onClick={handleNotify}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  {isNotifying ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </Button> */}

                {/* Not wired up yet — disabled rather than silently inert, so
                    they don't look clickable. Drop `disabled` once handled. */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="Share channel"
                  title="Sharing isn’t available yet"
                >
                  <Share2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="Channel settings"
                  title="Channel settings aren’t available yet"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <PostCreator />

        {/* Channel Posts */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Recent Posts</h2>
            {/* Sorting isn't implemented; disabled so it reads as inactive
                instead of a button that does nothing when clicked. */}
            <Button variant="outline" size="sm" disabled title="Sorting isn’t available yet">
              Sort by Latest
            </Button>
          </div>

          {newPosts.length ? (
            // Was a clickable <div>: no keyboard access, invisible to AT.
            // bg-success/10 alone was all but invisible against the gradient
            // page — it read as plain centred text rather than something you
            // can click. A border plus a hover state makes it an affordance.
            <button
              type="button"
              onClick={handleLoadNewPosts}
              className="w-full rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-center text-sm font-medium text-success shadow-sm transition-colors cursor-pointer hover:bg-success/20"
            >
              {newPosts.length} new post{newPosts.length > 1 ? "s" : ""} available
            </button>
          ) : null}

          {sortedPosts.length ? (
            sortedPosts.map((post) => (
              <Post
                key={post._id}
                post={post}
                isNew={newlyAddedIds.has(post._id)}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="font-medium">No posts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to post in {channelData.getChannel.name}.
              </p>
            </div>
          )}
        </div>

        {/* Load More */}
        {showLoadMore &&
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="px-8" onClick={handleLoadMorePosts}>
              Load More Posts
            </Button>
          </div>
        }
      </div>
    </div >
  );
}
