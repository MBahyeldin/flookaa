import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import { PostMenu } from "@/components/post-card";
import { useLikePost } from "@/components/post-card/useLikePost";
import PostContent, { parsePostContent } from "@/components/portable-text/PostContent";
import { readingStats } from "@/components/portable-text/readingStats";
import type { Post } from "@/generated/graphql";
import { cn } from "@/lib/utils";
import { shareLink } from "@/lib/share";
import formatDate, { formatRelativeDate } from "@/utils/formateDate";

const rowButton =
  "flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PostArticle({ post, channel }: { post: Post; channel: { id: number | string; name: string } }) {
  const navigate = useNavigate();
  const value = useMemo(() => parsePostContent(post.rawContent), [post.rawContent]);
  const { isArticle, minutes } = useMemo(() => readingStats(value), [value]);
  const { liked, likes, toggleLike } = useLikePost(post);
  const comments = post.meta.commentsCount;

  const link = {
    personaId: post.authorId,
    anonymous: post.author?.anonymous ?? true,
    name: post.author?.fullName ?? "",
    thumbnail: post.author?.profileImageUrl ?? undefined,
  };

  return (
    <article className="flex flex-col gap-6">
      <header className="flex min-w-0 items-center gap-3">
        <PersonaLink {...link} tabIndex={-1} className="shrink-0">
          <Avatar className="size-10">
            <AvatarImage src={post.author?.profileImageUrl || ""} />
            <GeneratedAvatarFallback name={post.author?.fullName ?? ""} />
          </Avatar>
        </PersonaLink>
        <div className="flex min-w-0 flex-col">
          <PersonaLink {...link} className="truncate text-sm font-medium">
            {post.author?.fullName}
          </PersonaLink>
          <p className="truncate text-xs text-muted-foreground">
            {channel.name}
            {post.createdAt ? (
              <>
                {" · "}
                <time dateTime={post.createdAt} title={formatDate(post.createdAt)}>
                  {formatRelativeDate(post.createdAt)}
                </time>
              </>
            ) : null}
            {isArticle ? ` · ${minutes} min read` : null}
          </p>
        </div>
        <PostMenu post={post} onDeleted={() => navigate(`/channels/${channel.id}`, { replace: true })} />
      </header>

      <PostContent value={value} article={isArticle} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-3">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className={cn(rowButton, liked && "text-destructive hover:text-destructive")}
        >
          <Heart className={cn("size-4", liked && "fill-destructive")} />
          {likes} {likes === 1 ? "like" : "likes"}
        </button>
        <button
          type="button"
          className={rowButton}
          onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })}
        >
          <MessageCircle className="size-4" />
          {comments} {comments === 1 ? "comment" : "comments"}
        </button>
        <button
          type="button"
          className={rowButton}
          onClick={() => shareLink(`${window.location.origin}/channels/${channel.id}/posts/${post._id}`, channel.name)}
        >
          <Share2 className="size-4" />
          Share
        </button>
      </div>
    </article>
  );
}
