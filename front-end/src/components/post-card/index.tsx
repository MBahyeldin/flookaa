import { useState } from "react";
import { ArrowRight, MoreHorizontal, Trash2 } from "lucide-react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useMutation } from "@apollo/client/react";
import { DeletePostDocument, type Post } from "@/generated/graphql";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import PostContent from "../portable-text/PostContent";
import { PostByline, type PostChannel } from "./PostByline";
import { Reactions } from "./Reactions";

export type { PostChannel };

export type PostVersion = "spine" | "canvas";

export function PostMenu({
  post,
  onDeleted,
  canModerate: canModerateProp,
}: {
  post: Post;
  onDeleted?: () => void;
  // The feed knows it per channel; elsewhere the page's store does.
  canModerate?: boolean;
}) {
  const { persona } = useUserProfileStore();
  const pageCanModerate = useAppStore((state) => state.canModerate);
  const canModerate = canModerateProp ?? pageCanModerate;
  const [deletePost, { loading: isDeleting }] = useMutation(DeletePostDocument);
  if (post.authorId !== persona?.id && !canModerate) return null;

  const handleDelete = async () => {
    if (!confirm("Delete this post? This can't be undone.")) return;
    try {
      await deletePost({ variables: { id: post._id } });
    } catch (err) {
      toast.error(
        CombinedGraphQLErrors.is(err)
          ? err.errors[0]?.message || "Couldn’t delete the post."
          : "Couldn’t delete the post. Check your connection."
      );
      return;
    }
    // Other viewers remove it from the websocket event; removePost ignores
    // the second call when that event reaches this tab too.
    useAppStore.getState().removePost(post._id);
    toast.success("Post deleted");
    onDeleted?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="ms-auto shrink-0" aria-label="Post options">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={isDeleting}
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Post({
  post,
  version = "spine",
  channel,
  onOpen,
  isNew = false,
  canModerate,
}: {
  post: Post;
  version?: PostVersion;
  channel?: PostChannel;
  // Opens the whole post with its comments.
  onOpen?: () => void;
  /** Arrived after the feed rendered — plays the entrance animation once. */
  isNew?: boolean;
  canModerate?: boolean;
}) {
  const [truncated, setTruncated] = useState(false);
  const canvas = version === "canvas";

  const byline = (
    <PostByline
      authorId={post.authorId}
      author={post.author}
      createdAt={post.createdAt}
      channel={channel}
      sticker={canvas}
    />
  );

  const content = (
    <PostContent
      rawContent={post.rawContent}
      preview={{ tone: canvas ? "accent" : "card", lead: canvas, onTruncatedChange: setTruncated }}
    />
  );

  const footer = (
    <div className="flex items-center gap-2">
      {truncated && onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Read the whole post
          <ArrowRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
        </button>
      ) : null}
      <div className="ms-auto">
        <Reactions post={post} onOpenComments={onOpen} />
      </div>
    </div>
  );

  if (canvas) {
    return (
      <article
        data-theme={channel?.theme ?? undefined}
        className={cn(
          "flex flex-col gap-4 rounded-2xl bg-accent px-5.5 pt-4.5 pb-5.5 text-foreground",
          isNew && "post-enter"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {byline}
          <PostMenu post={post} canModerate={canModerate} />
        </div>
        {content}
        {footer}
      </article>
    );
  }

  return (
    <article
      data-theme={channel?.theme ?? undefined}
      className={cn(
        "flex overflow-hidden rounded-2xl border bg-card text-card-foreground",
        isNew && "post-enter"
      )}
    >
      <div aria-hidden className="w-1.5 shrink-0 bg-primary" />
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-5 pt-5 pb-4.5">
        <div className="flex min-w-0 items-center gap-2">
          {byline}
          <PostMenu post={post} canModerate={canModerate} />
        </div>
        {content}
        <div className="h-px bg-border" />
        {footer}
      </div>
    </article>
  );
}
