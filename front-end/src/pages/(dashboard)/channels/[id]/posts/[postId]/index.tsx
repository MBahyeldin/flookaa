import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import NotFound from "@/components/not-found";
import CommentSection from "@/components/comment-section";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useGetChannelBarQuery, useGetPostsQuery } from "@/generated/graphql";
import { joinChannel, leaveChannel } from "@/services/channels";
import { useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useWebsocketService } from "@/Websocket.context";
import type { ChannelEventPayload, WsEventMessage } from "@/types/Ws";
import handleChannelEvents from "../../subscribe/handleChannelEvents";
import { ChannelBar, JoinButton } from "./ChannelBar";
import { PostArticle } from "./PostArticle";

const ignore = () => {};

export default function PostPage() {
  const { id: channelId, postId } = useParams<{ id: string; postId: string }>();
  if (!channelId || !postId) return <NotFound />;
  return <PostView key={`${channelId}/${postId}`} channelId={channelId} postId={postId} />;
}

function PostView({ channelId, postId }: { channelId: string; postId: string }) {
  const { websocketService } = useWebsocketService();
  const {
    data: barData,
    error: barError,
    refetch: refetchBar,
  } = useGetChannelBarQuery({ variables: { id: channelId }, fetchPolicy: "network-only" });
  const {
    data: postData,
    error: postError,
    refetch: refetchPost,
  } = useGetPostsQuery({
    variables: { ids: [postId], limit: 1, offset: 0, owner: { id: channelId, type: "CHANNEL" } },
    fetchPolicy: "network-only",
  });
  const [busy, setBusy] = useState(false);

  const setOwner = useAppStore((s) => s.setOwner);
  const resetPage = useAppStore((s) => s.resetPage);
  const addPosts = useAppStore((s) => s.addPosts);
  const setCanModerate = useAppStore((s) => s.setCanModerate);
  const storeOwner = useAppStore((s) => s.owner);
  const post = useAppStore((s) => s.posts[postId]);
  const deleted = useAppStore((s) => !!s.deletedIds[postId]);
  const isStoreOnThisChannel = storeOwner?.type === "CHANNEL" && String(storeOwner.id) === channelId;

  const pageOwner = useMemo(() => ({ id: channelId, type: "CHANNEL" as const }), [channelId]);
  useEffect(() => {
    setOwner(pageOwner);
    return () => resetPage();
  }, [pageOwner, setOwner, resetPage]);

  useEffect(() => {
    if (isStoreOnThisChannel && postData?.getPosts?.length) addPosts(postData.getPosts);
  }, [isStoreOnThisChannel, postData, addPosts]);

  const channel = barData?.getChannel;
  useEffect(() => {
    setCanModerate(channel?.canModerate ?? false);
  }, [channel?.canModerate, setCanModerate]);

  useEffect(() => {
    if (!websocketService) return;
    // Our own membership changes and someone else's member count both come from a refetch.
    const onMembershipEvent = (event: WsEventMessage["event"], payload: ChannelEventPayload) => {
      const me = useUserProfileStore.getState().persona?.id;
      const isMe = me != null && Number(payload.persona_id) === Number(me);
      if (isMe) {
        refetchBar();
        if (event.name === "member") refetchPost();
      } else if (event.name === "member") {
        refetchBar();
      }
    };
    const unsubscribe = websocketService.subscribeToChannelEvents(
      Number(channelId),
      handleChannelEvents({
        setNewPosts: ignore,
        onMembershipEvent,
        onInterestsChanged: ignore,
        onCommunityChanged: ignore,
        // An age limit the viewer no longer meets turns the page into "not found".
        onInfoChanged: () => {
          refetchBar();
          refetchPost();
        },
      })
    );
    return () => unsubscribe?.();
  }, [websocketService, channelId, refetchBar, refetchPost]);

  const handleJoin = async () => {
    if (!channel || busy) return;
    setBusy(true);
    if (channel.isPending) {
      const error = await leaveChannel(channelId);
      setBusy(false);
      if (error) return toast.error(error.message);
    } else {
      const result = await joinChannel(channelId);
      setBusy(false);
      if (result.error) return toast.error(result.error.message);
    }
    refetchBar();
  };

  const error = barError ?? postError;
  if (error) {
    if (error.message.includes("not found")) return <NotFound />;
    return (
      <ErrorState
        className="mx-4 mt-24"
        title="Couldn't load this post"
        onRetry={() => Promise.all([refetchBar(), refetchPost()])}
      />
    );
  }
  if (deleted || (postData && !postData.getPosts.length) || (barData && !channel)) return <NotFound />;
  // Refetches (membership, info.update) keep the page instead of flashing the skeleton.
  if (!channel || !post) return <PostSkeleton />;

  const joinPrompt = channel.isMember ? undefined : (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground">
      {channel.isPending ? "Your request to join is waiting for approval." : `Join ${channel.name} to comment.`}
      {!channel.isPending && (
        <JoinButton isPrivate={channel.isPrivate} isPending={false} busy={busy} onJoin={handleJoin} />
      )}
    </div>
  );

  return (
    <div data-theme={channel.theme} className="min-h-full bg-background text-foreground">
      <ChannelBar
        channel={channel}
        isMember={channel.isMember}
        isPending={channel.isPending}
        busy={busy}
        onJoin={handleJoin}
      />
      <div className="mx-auto flex w-full max-w-[712px] flex-col gap-10 px-4 py-8 md:py-12">
        <PostArticle post={post} place={{ name: channel.name, href: `/channels/${channel.id}` }} />
        <CommentSection parentId={post._id} totalCount={post.meta.commentsCount} composer={joinPrompt} />
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div role="status" aria-label="Loading post">
      <Skeleton className="h-14 rounded-none" />
      <div className="mx-auto flex w-full max-w-[712px] flex-col gap-6 px-4 py-8 md:py-12">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <SkeletonList count={1} variant="post" />
      </div>
    </div>
  );
}
