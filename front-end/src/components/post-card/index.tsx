 
import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { useCreateLikeMutation, useDeletePostMutation, type Post } from "@/generated/graphql";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import { PortableText as PortableTextReact } from "@portabletext/react";
import deNormalizeBlocks from "@/utils/deNormalizeBlocks";
import { useBlockObjectsProvider } from "@/BlockObjectsProvider.context";
import CommentSection from "../comment-section";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/stores/AppStore";
import useAudioContext from "@/hooks/useAudioContext";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import formatDate, { formatRelativeDate } from "@/utils/formateDate";
import displayBlockComponents from "../portable-text/displayBlocks";



export function Post({
  post,
  isNew = false,
  initialShowComments = false,
}: {
  post: Post;
  /** Arrived after the feed rendered — plays the entrance animation once. */
  isNew?: boolean;
  /** Start with comments expanded (e.g. opened from a notification). */
  initialShowComments?: boolean;
}) {
  const [showComments, setShowComments] = useState(initialShowComments);
  const { persona } = useUserProfileStore();
  const { blockObjectsProvider } = useBlockObjectsProvider();
  const owner = useAppStore((state) => state.owner);
  const [createLike] = useCreateLikeMutation();
  const [deletePost, { loading: isDeleting }] = useDeletePostMutation();
  const canModerate = useAppStore((state) => state.canModerate);
  const canDelete = post.authorId === persona?.id || canModerate;

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
  };

  const [liked, setLiked] = useState(post.personalizedMeta?.likedByPersona || false);
  const [localLikes, setLocalLikes] = useState(post.meta?.likesCount || 0);
  const [triggerHeartAnimation, setTriggerHeartAnimation] = useState(false);
  


  const [isLiking, setIsLiking] = useState(false);

  const toggleLike = async () => {
    if (!persona?.id || !owner || isLiking) return;
    const nextLiked = !liked;

    // Wait for the server before flipping `liked`: it drives the heart
    // animation, and a rejected like (e.g. "join the channel first") must not
    // animate. The in-flight guard stops double clicks from racing.
    setIsLiking(true);
    try {
      await createLike({
        variables: {
          targetId: post._id,
          targetType: "POST",
          liked: nextLiked,
          owner: {
            id: owner.id,
            type: owner.type,
          },
        },
      });
    } catch (err) {
      toast.error(
        CombinedGraphQLErrors.is(err)
          ? err.errors[0]?.message || "Couldn’t update your like."
          : "Couldn’t update your like. Check your connection."
      );
      return;
    } finally {
      setIsLiking(false);
    }

    setLiked(nextLiked);

    /*
     * The sound belongs here, not in the likesCount effect below.
     *
     * That effect only sees the number go up, so it fired for *everyone's*
     * likes arriving over the websocket — a busy post would chirp repeatedly
     * at a reader who did nothing. Here we know the like is the current user's.
     *
     * It still runs from the click handler, well within the browser's
     * transient-activation window after the request, which satisfies the
     * autoplay policy; the effect had no gesture behind it and logged
     * "AudioContext was not allowed to start".
     */
    if (nextLiked) {
      playSound("HEART_REACT");
    }
  };

  const { playSound } = useAudioContext();


  useEffect(() => {
    // Visual only. Any like — mine or anyone else's — is worth showing, but
    // the sound is reserved for the current user's own like (see toggleLike).
    if (post.meta?.likesCount > localLikes) {
      setTriggerHeartAnimation(true);
    }
    setLocalLikes(post.meta?.likesCount || 0);
  }, [localLikes, post.meta?.likesCount]);


  const types = useMemo(() => {
    return blockObjectsProvider?.getBlockTypes() ?? [];
  }, [blockObjectsProvider]);
  const blockObjects = useMemo(() => {
    return blockObjectsProvider?.getBlockObjects() ?? [];
  }, [blockObjectsProvider]);




  return (
    // A real 1px border reads cleaner than border-0 + shadow alone: against a
    // gradient page the shadow-only edge was vague. rounded-xl matches the
    // hero card so the column shares one silhouette.
    <Card
      className={`rounded-xl border border-border/70 shadow-sm ${
        isNew ? "post-enter" : ""
      }`}
    >
      <CardContent className="p-4 sm:p-6">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.profileImageUrl || ""} />
              <AvatarFallback>
                {post.author?.fullName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-x-2">                <h4 className="text-base font-medium">{post.author?.fullName}</h4>
                <span className="text-sm text-muted-foreground">
                  @{post.author?.username}
                </span>
              </div>
              {post.createdAt && (
                <p className="text-sm text-muted-foreground">
                  <time
                    dateTime={post.createdAt}
                    title={formatDate(post.createdAt)}
                  >
                    {formatRelativeDate(post.createdAt)}
                  </time>
                </p>
              )}
            </div>
          </div>

          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Post options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              {/* Edit was listed here but never wired up; it returns with post editing. */}
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Post Content */}
        <div className="space-y-4">
          <PortableTextReact
            value={deNormalizeBlocks(
              JSON.parse(post.rawContent || "[]").blocks || [],
              types
            )}
            components={{
              ...displayBlockComponents,
              types: blockObjects.reduce((acc, blockObject) => {
                acc[blockObject.name] = blockObject.renderBlock;
                return acc;
              }, {} as any),
            }}
          />
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLike}
              aria-pressed={liked}
              aria-label={`${liked ? "Unlike" : "Like"} — ${localLikes} ${localLikes === 1 ? "like" : "likes"}`}
              className={`relative flex items-center space-x-2 transition-all ${liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {/* Heart Icon */}
              <motion.div
                animate={liked ? "liked" : "unliked"}
                variants={{
                  liked: {
                    scale: [1, 1.3, 1],
                    rotate: [0, -10, 10, 0],
                    transition: {
                      duration: 0.4,
                      ease: "easeInOut",
                    },
                  },
                  unliked: {
                    scale: 1,
                    rotate: 0,
                  },
                }}
              >
                <Heart
                  className={`h-4 w-4 ${liked ? "fill-destructive stroke-destructive" : "stroke-current"
                    }`}
                />
              </motion.div>

              {/* Like Count */}
              <span>{localLikes}</span>

              {/* Floating Heart Animation */}
              <AnimatePresence>
                {triggerHeartAnimation && (
                  <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                    {[...Array(6)].map((_, index) => {
                      const spread = (index - 2.5) * 10 // horizontal distance

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.6, y: 0, x: 0 }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0.6, 1.4, 1],
                            y: [-5, -20, -35],
                            x: spread,
                          }}
                          transition={{
                            duration: 1.0,
                            delay: index * 0.3, // 100ms stagger
                            ease: "easeOut",
                          }}
                          onAnimationComplete={() => {
                            if (index === 5) {
                              setTriggerHeartAnimation(false)
                            }
                          }}
                          className="absolute text-destructive"
                        >
                          <Heart className="h-5 w-5 fill-destructive stroke-destructive" />
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(true)}
              aria-label={`Show comments — ${post.meta.commentsCount} ${post.meta.commentsCount === 1 ? "comment" : "comments"}`}
              className="flex items-center space-x-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.meta.commentsCount}</span>
            </Button>

            {/* Not wired up yet — disabled so it doesn't read as clickable. */}
            <Button
              variant="ghost"
              size="sm"
              disabled
              aria-label="Share post"
              title="Sharing isn’t available yet"
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              {/* <span>{shares}</span> */}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(prev => !prev)}
            aria-expanded={showComments}
            aria-label={showComments ? "Collapse comments" : "Expand comments"}
          >
            {showComments ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
          <CommentSection parentId={post._id} showComments={showComments} totalCount={post.meta.commentsCount} />
      </CardContent>

    </Card>
  );
}
