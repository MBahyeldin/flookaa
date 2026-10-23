// Avatar from ../ui/avatar, not the raw Radix Root: the styled wrapper supplies
// `overflow-hidden rounded-full`, without which the image isn't clipped to a circle.
import { Avatar, AvatarImage } from "../ui/avatar";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import { useCreateLikeMutation, useDeleteCommentMutation, useGetCommentsLazyQuery, type SimpleInput } from "@/generated/graphql";
import { ChevronDown, Ellipsis, Heart, Loader2, Trash2, X } from "lucide-react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import formatDate, { formatRelativeDate } from "@/utils/formateDate";
import { useAppStore } from "@/stores/AppStore";
import CommentInput from "./input";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import AudioPlayer from "../audio-player";
import useNewlyAdded from "@/hooks/useNewlyAdded";
import { useUserProfileStore } from "@/stores/UserProfileStore";

const FIRST_REPLIES = 2;
const REPLY_PAGE = 10;
const NO_REPLIES: string[] = [];

function byCreatedAt(ids: string[]) {
    const comments = useAppStore.getState().comments;
    return ids
        .map((id) => comments[id])
        .filter(Boolean)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

const CommentItem = React.memo(({
    commentId,
    level,
    depth,
    replyingTo,
    isNew = false,
}: {
    commentId: string;
    /** The `level` the backend stores; a reply to this comment is level + 1. */
    level: number;
    /** 1 for a comment on the post. Indent stops at 2; deeper replies name their parent. */
    depth: number;
    replyingTo?: string;
    /** Arrived after the thread rendered — animates in and scrolls into view. */
    isNew?: boolean;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const comment = useAppStore((state) => state.comments[commentId]);
    const replyIds = useAppStore((state) => state.commentsByComment[commentId] ?? NO_REPLIES);
    const canModerate = useAppStore((state) => state.canModerate);
    const owner = useAppStore((state) => state.owner);
    const { persona } = useUserProfileStore();

    const { rawContent } = comment ?? {};
    const commentContent = useMemo<SimpleInput>(() => {
        if (!rawContent) return "";
        try {
            return JSON.parse(rawContent);
        } catch {
            return rawContent;
        }
    }, [rawContent]);

    const isOwnComment = persona?.id != null && comment?.authorId === persona.id;
    const [showReplyInput, setShowReplyInput] = useState(false);

    const [createLike] = useCreateLikeMutation();
    const [liked, setLiked] = useState(comment?.personalizedMeta?.likedByPersona ?? false);
    const [isLiking, setIsLiking] = useState(false);
    const likesCount = comment?.meta.likesCount ?? 0;

    // Same flow as the post: flip `liked` only once the server accepts, and
    // let the count arrive over the websocket (handleLikeEvents).
    const toggleLike = async () => {
        if (!persona?.id || !owner || !comment || isLiking) return;
        const nextLiked = !liked;
        setIsLiking(true);
        try {
            await createLike({
                variables: {
                    targetId: comment._id,
                    targetType: "COMMENT",
                    liked: nextLiked,
                    owner: { id: owner.id, type: owner.type },
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
    };

    const [deleteComment, { loading: isDeleting }] = useDeleteCommentMutation();
    const canDelete = isOwnComment || canModerate;

    const handleDelete = async () => {
        if (!comment || !confirm("Delete this comment and its replies? This can't be undone.")) return;
        try {
            await deleteComment({ variables: { id: comment._id } });
        } catch (err) {
            toast.error(
                CombinedGraphQLErrors.is(err)
                    ? err.errors[0]?.message || "Couldn’t delete the comment."
                    : "Couldn’t delete the comment. Check your connection."
            );
            return;
        }
        // removeComment ignores the websocket event's second call.
        useAppStore.getState().removeComment(comment._id, comment.parentId, depth === 1 ? "POST" : "COMMENT");
    };

    // Our own offset, not the list length: live replies land in the same list
    // and would make the next page skip older ones.
    const [fetchReplies] = useGetCommentsLazyQuery();
    const [fetched, setFetched] = useState(0);
    const [repliesLoading, setRepliesLoading] = useState(false);
    const [repliesError, setRepliesError] = useState(false);
    const [opened, setOpened] = useState(depth === 1);

    const loadReplies = useCallback(async (limit: number) => {
        setRepliesLoading(true);
        setRepliesError(false);
        try {
            const { data, error } = await fetchReplies({ variables: { parentId: commentId, limit, offset: fetched } });
            if (error) throw error;
            setFetched((n) => n + limit);
            useAppStore.getState().addCommentsToComment(commentId, data?.getComments ?? []);
        } catch {
            setRepliesError(true);
        } finally {
            setRepliesLoading(false);
        }
    }, [fetchReplies, commentId, fetched]);

    const repliesCount = comment?.meta.commentsCount ?? 0;
    const requestedFirst = useRef(false);
    useEffect(() => {
        if (depth !== 1 || repliesCount === 0 || requestedFirst.current) return;
        requestedFirst.current = true;
        loadReplies(FIRST_REPLIES);
    }, [depth, repliesCount, loadReplies]);

    const replies = useMemo(() => byCreatedAt(replyIds), [replyIds]);
    const newReplyIds = useNewlyAdded(replies.map((reply) => reply._id));
    // A collapsed thread still shows my own replies, so they don't land somewhere
    // invisible; someone else's only bumps the count instead of pushing the page down.
    const visibleReplies = opened ? replies : replies.filter((reply) => reply.authorId === persona?.id);
    const hiddenCount = Math.max(0, repliesCount - visibleReplies.length);

    const showMoreReplies = () => {
        setOpened(true);
        if (fetched < repliesCount) loadReplies(REPLY_PAGE);
    };

    /*
     * Scroll a newly arrived item into view, but only when it's mine: a
     * stranger's comment landing mid-read would move the page under the reader.
     */
    useEffect(() => {
        if (!isNew || !isOwnComment || !containerRef.current) return;
        const timer = setTimeout(() => {
            containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 80); // let the entrance animation start first
        return () => clearTimeout(timer);
    }, [isNew, isOwnComment]);

    if (!comment || !comment.author) return null;

    const authorName = comment.author.fullName;
    const link = {
        personaId: comment.authorId,
        anonymous: comment.author.anonymous,
        name: authorName,
        thumbnail: comment.author.profileImageUrl ?? undefined,
    };

    return (
        <div ref={containerRef} className={cn("min-w-0", isNew && "post-enter")}>
            <div className="flex min-w-0 gap-2.5">
                <PersonaLink {...link} tabIndex={-1} className="shrink-0">
                    <Avatar className={depth === 1 ? "size-7" : "size-6"}>
                        <AvatarImage src={comment.author.profileImageUrl ?? ""} />
                        <GeneratedAvatarFallback name={authorName} />
                    </Avatar>
                </PersonaLink>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <PersonaLink {...link} className="min-w-0 truncate text-sm font-medium">
                            {authorName}
                        </PersonaLink>
                        <time
                            dateTime={comment.createdAt}
                            title={formatDate(comment.createdAt)}
                            className="shrink-0 text-xs text-muted-foreground"
                        >
                            {formatRelativeDate(comment.createdAt)}
                        </time>
                        {canDelete && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" className="ms-auto shrink-0" aria-label="Comment options">
                                        <Ellipsis className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        disabled={isDeleting}
                                        onClick={handleDelete}
                                    >
                                        <Trash2 className="size-4" />
                                        Delete comment
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {replyingTo && <p className="text-xs text-muted-foreground">Replying to {replyingTo}</p>}

                    {commentContent.type === "TEXT" ? (
                        <p dir="auto" className="break-words text-sm">{commentContent.content}</p>
                    ) : commentContent.type === "MEDIA" ? (
                        <img src={commentContent.content} alt="" className="h-auto max-w-full rounded-md sm:max-w-[300px]" />
                    ) : commentContent.type === "VOICE" ? (
                        <AudioPlayer src={commentContent.content} className="mt-1" />
                    ) : null}

                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                        <button
                            type="button"
                            className={cn(
                                "flex items-center gap-1 rounded-sm transition-colors hover:text-foreground disabled:opacity-60",
                                liked && "text-primary hover:text-primary"
                            )}
                            onClick={toggleLike}
                            disabled={isLiking}
                            aria-pressed={liked}
                            aria-label={`${liked ? "Unlike" : "Like"} — ${likesCount} ${likesCount === 1 ? "like" : "likes"}`}
                        >
                            <Heart className={cn("size-3.5", liked && "fill-primary")} />
                            {likesCount}
                        </button>
                        <button
                            type="button"
                            className="rounded-sm transition-colors hover:text-foreground"
                            aria-expanded={showReplyInput}
                            onClick={() => setShowReplyInput((prev) => !prev)}
                        >
                            Reply
                        </button>
                    </div>

                    <AnimatePresence>
                        {showReplyInput && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2 }}
                                className="mt-2 flex flex-col gap-1.5"
                            >
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    Replying to {authorName}
                                    <button
                                        type="button"
                                        aria-label="Cancel reply"
                                        className="rounded-sm hover:text-foreground"
                                        onClick={() => setShowReplyInput(false)}
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                                <CommentInput
                                    parentId={comment._id}
                                    level={level + 1}
                                    autoFocus
                                    onSent={() => {
                                        setShowReplyInput(false);
                                        setOpened(true);
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {(visibleReplies.length > 0 || hiddenCount > 0) && (
                <div className={cn("mt-4 flex flex-col gap-4", depth === 1 && "ms-3.5 border-s ps-5")}>
                    {visibleReplies.map((reply) => (
                        <CommentItem
                            key={reply._id}
                            commentId={reply._id}
                            level={level + 1}
                            depth={depth + 1}
                            replyingTo={depth >= 2 ? authorName : undefined}
                            isNew={newReplyIds.has(reply._id)}
                        />
                    ))}

                    {repliesLoading ? (
                        <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            {visibleReplies.length ? "Loading more replies…" : "Loading replies…"}
                        </div>
                    ) : repliesError ? (
                        <div role="alert" className="flex items-center gap-2 text-xs text-muted-foreground">
                            Couldn't load replies.
                            <button type="button" className="font-medium text-primary hover:underline" onClick={showMoreReplies}>
                                Try again
                            </button>
                        </div>
                    ) : hiddenCount > 0 ? (
                        <button
                            type="button"
                            className="flex w-fit items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline"
                            onClick={showMoreReplies}
                        >
                            {visibleReplies.length ? `View ${hiddenCount} more ${hiddenCount === 1 ? "reply" : "replies"}` : `View ${hiddenCount} ${hiddenCount === 1 ? "reply" : "replies"}`}
                            <ChevronDown className="size-3.5" />
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
});
export default CommentItem;
