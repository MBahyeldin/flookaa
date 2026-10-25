import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import NotFound from "@/components/not-found";
import CommentSection from "@/components/comment-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/components/ui/logo";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useGetPostsQuery } from "@/generated/graphql";
import { fetchPersonaProfile } from "@/services/persona";
import { useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useWebsocketService } from "@/Websocket.context";
import type { PersonaProfile } from "@/types/persona";
import handleChannelEvents from "@/pages/(dashboard)/channels/[id]/subscribe/handleChannelEvents";
import { PostArticle } from "@/pages/(dashboard)/channels/[id]/posts/[postId]/PostArticle";
import { fullName } from "../../ProfileHero";

const ignore = () => {};

export default function WallPostPage() {
  const { id: personaId, postId } = useParams<{ id: string; postId: string }>();
  if (!personaId || !postId) return <NotFound />;
  return <WallPostView key={`${personaId}/${postId}`} personaId={personaId} postId={postId} />;
}

function WallPostView({ personaId, postId }: { personaId: string; postId: string }) {
  const { websocketService } = useWebsocketService();
  const viewerId = useUserProfileStore((s) => s.persona?.id);
  const [persona, setPersona] = useState<PersonaProfile | "not_found" | "error" | null>(null);
  const {
    data: postData,
    error: postError,
    refetch: refetchPost,
  } = useGetPostsQuery({
    variables: { ids: [postId], limit: 1, offset: 0, owner: { id: personaId, type: "PERSONA" } },
    fetchPolicy: "network-only",
  });

  const setOwner = useAppStore((s) => s.setOwner);
  const resetPage = useAppStore((s) => s.resetPage);
  const addPosts = useAppStore((s) => s.addPosts);
  const setCanModerate = useAppStore((s) => s.setCanModerate);
  const storeOwner = useAppStore((s) => s.owner);
  const post = useAppStore((s) => s.posts[postId]);
  const deleted = useAppStore((s) => !!s.deletedIds[postId]);
  const isStoreOnWall = storeOwner?.type === "PERSONA" && String(storeOwner.id) === personaId;

  const loadPersona = useCallback(async () => {
    const result = await fetchPersonaProfile(personaId);
    if (result === "not_found" || (result && result.locked)) setPersona("not_found");
    else setPersona(result ?? "error");
  }, [personaId]);

  useEffect(() => {
    loadPersona();
  }, [loadPersona]);

  const pageOwner = useMemo(() => ({ id: personaId, type: "PERSONA" as const }), [personaId]);
  useEffect(() => {
    setOwner(pageOwner);
    setCanModerate(String(viewerId) === personaId);
    return () => resetPage();
  }, [pageOwner, viewerId, personaId, setOwner, setCanModerate, resetPage]);

  useEffect(() => {
    if (isStoreOnWall && postData?.getPosts?.length) addPosts(postData.getPosts);
  }, [isStoreOnWall, postData, addPosts]);

  useEffect(() => {
    if (!websocketService) return;
    return websocketService.subscribeToProfileEvents(
      Number(personaId),
      handleChannelEvents({
        setNewPosts: ignore,
        onMembershipEvent: ignore,
        onInterestsChanged: ignore,
        onCommunityChanged: ignore,
        onInfoChanged: ignore,
      })
    );
  }, [websocketService, personaId]);

  if (persona === "not_found") return <NotFound />;
  if (postError || persona === "error") {
    if (postError?.message.includes("not found")) return <NotFound />;
    return (
      <ErrorState
        className="mx-4 mt-24"
        title="Couldn't load this post"
        onRetry={() => Promise.all([loadPersona(), refetchPost()])}
      />
    );
  }
  if (deleted || (postData && !postData.getPosts.length)) return <NotFound />;
  if (!persona || !post) return <WallPostSkeleton />;

  const name = fullName(persona);
  return (
    <div data-theme={persona.theme} className="min-h-full bg-background text-foreground">
      <PersonaBar persona={persona} />
      <div className="mx-auto flex w-full max-w-[712px] flex-col gap-10 px-4 py-8 md:py-12">
        <PostArticle post={post} place={{ name, href: `/personas/${persona.id}` }} />
        <CommentSection parentId={post._id} totalCount={post.meta.commentsCount} />
      </div>
    </div>
  );
}

function PersonaBar({ persona }: { persona: PersonaProfile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = `/personas/${persona.id}`;
  const name = fullName(persona);
  // "default" is the first entry of this tab: there is nothing in-app to go back to.
  const back = () => (location.key !== "default" ? navigate(-1) : navigate(path));

  return (
    <div className="sticky top-14 z-10 border-b bg-background/95 backdrop-blur md:top-0">
      <div className="flex h-14 items-center gap-3 px-4 md:px-8">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={back}>
          <ArrowLeft className="rtl:-scale-x-100" />
        </Button>
        <Link
          to={path}
          className="flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar size="sm">
            {persona.thumbnail && <AvatarImage src={persona.thumbnail} />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">@{persona.slug}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function WallPostSkeleton() {
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
