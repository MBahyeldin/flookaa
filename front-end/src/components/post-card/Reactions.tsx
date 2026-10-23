import { Heart, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Post } from "@/generated/graphql";
import { cn } from "@/lib/utils";
import { useLikePost } from "./useLikePost";

const pillButton =
  "flex items-center gap-1.5 rounded-full px-1 text-sm font-medium tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Reactions({ post, onOpenComments }: { post: Post; onOpenComments?: () => void }) {
  const { liked, likes, toggleLike, burst, endBurst } = useLikePost(post);
  const comments = post.meta.commentsCount;

  return (
    <div className="flex items-center gap-2.5 rounded-full border bg-card py-1.5 ps-3 pe-3 text-card-foreground shadow-sm">
      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label={`${liked ? "Unlike" : "Like"} — ${likes} ${likes === 1 ? "like" : "likes"}`}
        className={cn(pillButton, "relative", liked && "text-destructive")}
      >
        <motion.span
          className="flex"
          animate={liked ? "liked" : "unliked"}
          variants={{
            liked: { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0], transition: { duration: 0.4, ease: "easeInOut" } },
            unliked: { scale: 1, rotate: 0 },
          }}
        >
          <Heart className={cn("size-4", liked && "fill-destructive stroke-destructive")} />
        </motion.span>
        <span className="text-foreground">{likes}</span>
        <AnimatePresence>
          {burst && (
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2">
              {[...Array(6)].map((_, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.6, y: 0, x: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 1], y: [-5, -20, -35], x: (index - 2.5) * 10 }}
                  transition={{ duration: 1.0, delay: index * 0.3, ease: "easeOut" }}
                  onAnimationComplete={() => index === 5 && endBurst()}
                  className="absolute text-destructive"
                >
                  <Heart className="size-5 fill-destructive stroke-destructive" />
                </motion.span>
              ))}
            </span>
          )}
        </AnimatePresence>
      </button>
      {onOpenComments ? (
        <button
          type="button"
          onClick={onOpenComments}
          aria-label={`Comments — ${comments} ${comments === 1 ? "comment" : "comments"}`}
          className={pillButton}
        >
          <MessageCircle className="size-4" />
          {comments}
        </button>
      ) : (
        <span className="flex items-center gap-1.5 px-1 text-sm font-medium">
          <MessageCircle aria-hidden className="size-4" />
          {comments}
          <span className="sr-only">{comments === 1 ? "comment" : "comments"}</span>
        </span>
      )}
    </div>
  );
}
