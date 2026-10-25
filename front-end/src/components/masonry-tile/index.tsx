import { useMemo } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { FeedChannel, Post } from "@/generated/graphql";
import { Logo } from "@/components/ui/logo";
import { responsiveImage } from "@/components/portable-text/blocks/responsiveImage";
import { cn } from "@/lib/utils";
import { tileContent } from "./tileContent";

// Taller images are cropped to 4:5.
const MIN_RATIO = 4 / 5;

/** A post in a masonry list: lead image or first line and excerpt, its channel, plain counts. */
export function MasonryTile({ post, channel }: { post: Post; channel?: FeedChannel }) {
  const { image, line, excerpt } = useMemo(() => tileContent(post.rawContent), [post.rawContent]);
  const theme = channel?.theme;
  const ratio = image?.width && image.height ? Math.max(image.width / image.height, MIN_RATIO) : 4 / 3;
  const likes = post.meta.likesCount;
  const comments = post.meta.commentsCount ?? 0;

  return (
    <Link
      to={`/channels/${post.owner.id}/posts/${post._id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <article className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground transition-colors group-hover:border-foreground/25">
        {image ? (
          <img
            src={image.src}
            {...responsiveImage(image.src, image.width, 1)}
            sizes="(min-width: 64rem) 20rem, (min-width: 40rem) 50vw, 100vw"
            alt={image.alt ?? ""}
            loading="lazy"
            className="w-full bg-muted object-cover"
            style={{ aspectRatio: ratio }}
          />
        ) : (
          <div data-theme={theme} className="h-1 bg-primary" />
        )}
        <div className="flex flex-col gap-2.5 p-4">
          {channel && (
            <div className="flex min-w-0 items-center gap-2">
              <span data-theme={theme} className="contents">
                <Logo name={channel.name} src={channel.thumbnail} size="sm" />
              </span>
              <span className="truncate text-xs font-medium">{channel.name}</span>
            </div>
          )}
          {line && (
            <p dir="auto" className={cn("line-clamp-2 font-medium group-hover:text-primary", !image && "text-h4")}>
              {line}
            </p>
          )}
          {excerpt && (
            <p dir="auto" className="line-clamp-4 text-sm text-muted-foreground">
              {excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" aria-label={`${likes} ${likes === 1 ? "like" : "likes"}`}>
              <Heart className="size-3.5" aria-hidden />
              {likes}
            </span>
            <span className="flex items-center gap-1" aria-label={`${comments} ${comments === 1 ? "comment" : "comments"}`}>
              <MessageCircle className="size-3.5" aria-hidden />
              {comments}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function SkeletonTile({ tall = false }: { tall?: boolean }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      {tall && <div className="aspect-[4/5] animate-pulse bg-muted" />}
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center gap-2">
          <div className="size-8 animate-pulse rounded-sm bg-muted" />
          <div className="h-2.5 w-24 animate-pulse rounded-sm bg-muted" />
        </div>
        <div className="h-3 w-full animate-pulse rounded-sm bg-muted" />
        {!tall && <div className="h-3 w-3/4 animate-pulse rounded-sm bg-muted" />}
      </div>
    </div>
  );
}
