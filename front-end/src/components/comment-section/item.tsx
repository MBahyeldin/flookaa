// Avatar from ../ui/avatar, not the raw Radix Root: the styled wrapper supplies
// `overflow-hidden rounded-full`, without which the image isn't clipped to a circle.
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useGetCommentsLazyQuery, type Comment, type GetCommentsQuery, type GetCommentsQueryVariables, type SimpleInput } from "@/generated/graphql";
import { ChevronDown, ChevronRight, Loader2, User2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import formatDate from "@/utils/formateDate";
import useCustomInfiniteQuery from "@/hooks/useCustomInfinteQuery";
import { useAppStore } from "@/stores/AppStore";
import CommentInput from "./input";
import { Button } from "../ui/button";
import AudioPlayer from "../audio-player";
import useNewlyAdded from "@/hooks/useNewlyAdded";
import { useUserProfileStore } from "@/stores/UserProfileStore";

const CommentItem = React.memo(({
    commentId,
    isReply = false,
    level,
    isNew = false,
}: {
    commentId: string;
    isReply?: boolean;
    level: number;
    /** Arrived after the thread rendered — animates in and scrolls into view. */
    isNew?: boolean;
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const comment = useAppStore((state) => state.comments[commentId]);


    const { rawContent } = comment ?? {};
    const commentContent = useMemo<SimpleInput>(() => {
        if (!rawContent) return "";
        try {
            return JSON.parse(rawContent);
        } catch {
            return rawContent;
        }
    }, [rawContent]);
    const [showReplyInput, setShowReplyInput] = useState(false);

    // Authored by the current persona — used to decide whether arriving
    // content is allowed to move the viewport.
    const { persona } = useUserProfileStore();
    const isOwnComment =
        persona?.id != null && comment?.authorId === persona.id;

    const [collapsed, setCollapsed] = useState(true);

    const formatedDate = useMemo(() => {
        if (!comment?.createdAt) return "";
        return formatDate(comment.createdAt);
    }, [comment?.createdAt]);


    const [showLoadMoreComments, setShowLoadMoreComments] = useState(false);
    const { loadMore, isLoading, result } = useCustomInfiniteQuery<GetCommentsQuery, GetCommentsQueryVariables, Comment[]>({
        queryFn: useGetCommentsLazyQuery()[0],
        storeSelector: (state) => state.commentsByComment[comment?._id],
        updateStoreWithData: (data) => {
            if (!data?.getComments) return;
            const addCommentsToComment = useAppStore.getState().addCommentsToComment;
            addCommentsToComment(comment?._id || "", data.getComments);

            if ((data?.getComments?.length || 0) + result.length < (comment?.meta.commentsCount || 0)) {
                setShowLoadMoreComments(true);
            } else {
                setShowLoadMoreComments(false);
            }
        },
        optionVariables: {
            variables: {
                parentId: comment?._id || "",
            },
        },
        normalizeData: (data) => {
            const comments = useAppStore.getState().comments;
            return data.map(id => comments[id]).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) || [];
        },
        limit: 10,
        initialOffset: 0,
    });

    useEffect(() => {
        if (!collapsed && comment?.meta.commentsCount && comment.meta.commentsCount > 0 && result.length === 0) {
            loadMore();
        }
    }, [collapsed, comment.meta.commentsCount, loadMore, result.length]);

    // Replies that arrived after this thread rendered.
    const newReplyIds = useNewlyAdded(result.map((reply) => reply._id));

    /*
     * Expand a collapsed thread when *I* reply — otherwise my reply lands
     * somewhere invisible and only the count moves.
     *
     * Someone else's reply deliberately doesn't expand it: that would push the
     * rest of the page down mid-read, which is the same disruption as an
     * unsolicited scroll. Their reply still bumps the count, so it's
     * discoverable without hijacking the layout.
     */
    const hasOwnNewReply = result.some(
        (reply) => newReplyIds.has(reply._id) && reply.authorId === persona?.id
    );

    useEffect(() => {
        if (hasOwnNewReply && collapsed) {
            setCollapsed(false);
        }
    }, [hasOwnNewReply, collapsed]);

    /*
     * Scroll a newly arrived item into view — but only when it's mine.
     *
     * Every new comment animates, since that's a useful ambient signal. Moving
     * the viewport is different: a stranger's comment landing mid-read would
     * yank the page out from under you, and on a busy thread it would fight
     * you continuously. Jumping is only welcome when it's the result of
     * something you just did.
     *
     * `block: "nearest"` so it doesn't re-centre a comment already on screen.
     */
    useEffect(() => {
        if (!isNew || !isOwnComment || !containerRef.current) return;
        const timer = setTimeout(() => {
            containerRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }, 80); // let the entrance animation start first
        return () => clearTimeout(timer);
    }, [isNew, isOwnComment]);



    if (!comment || !comment.author) return null;


    return (
        /*
          The avatar sits inside the bubble, on the author row, rather than as a
          sibling to its left. Two reasons:
            - the content column is no longer indented past the avatar, so text
              starts at the bubble's own padding edge (aligned with the avatar);
            - each nesting level used to cost avatar + gap (84px at desktop,
              52px at mobile) on top of the indent. Now a level costs only the
              indent itself, so deep reply threads stay readable on a phone.
        */
        <div
            ref={containerRef}
            /* post-enter is the same keyframe set the feed uses for new posts,
               so comments, replies and posts all arrive the same way. */
            className={`relative min-w-0 ${isNew ? "post-enter" : ""} ${isReply ? "ml-3 sm:ml-6 mt-3 sm:mt-4" : "mt-4 sm:mt-6"}`}
        >
            {/* Dashed vertical line for replies — offset tracks the indent above */}
            {isReply && (
                <div className="absolute -left-1.5 sm:-left-3 -top-3 sm:-top-4 bottom-0 border-l border-dashed border-muted-foreground/40"></div>
            )}

            <div className="min-w-0 space-y-2">
                <div className="bg-muted rounded-2xl px-3 py-2 sm:px-4 shadow-sm">
                    {/* Author row: avatar + name + handle */}
                    <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                            <AvatarImage
                                src={comment.author?.profileImageUrl ?? ""}
                                className="h-full w-full rounded-full"
                            />
                            <AvatarFallback>
                                <User2 className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                            <span className="font-medium text-sm truncate">{comment.author.fullName}</span>
                            <span className="text-xs text-muted-foreground truncate">@{comment.author.username}</span>
                        </div>
                    </div>
                    {
                        commentContent.type === "TEXT" ? (
                            <p className="text-sm text-foreground break-words">{commentContent.content}</p>
                        ) : commentContent.type === "MEDIA" ? (
                            <img src={commentContent.content} alt="" className="rounded-md max-w-full sm:max-w-[300px] h-auto" />
                        ) : commentContent.type === "VOICE" ? (
                            <AudioPlayer src={commentContent.content} className="mt-1" />
                        ) : null

                    }
                </div>

                <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-muted-foreground px-3 sm:px-4">
                    <div className="flex min-w-0 items-center gap-x-2">
                        {comment.meta.commentsCount ? (
                            <button
                                className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                                aria-label={collapsed ? "Expand replies" : "Collapse replies"}
                                aria-expanded={!collapsed}
                                onClick={() => setCollapsed((prev) => !prev)}
                            >
                                {collapsed ? (
                                    <ChevronRight className="h-3 w-3" />
                                ) : (
                                    <ChevronDown className="h-3 w-3" />
                                )}
                            </button>
                        ) : null}
                        <span className="truncate">{formatedDate}</span>
                    </div>

                    <div className="flex flex-nowrap items-center gap-x-4">
                        <button className="hover:text-foreground transition-colors">Like</button>
                        <button
                            className="hover:text-foreground transition-colors"
                            onClick={() => setShowReplyInput((prev) => !prev)}
                        >
                            Reply
                        </button>
                        {/* Boolean(...) not `count && count > 0 &&`: with a count of
                            0 that expression returns 0, and React renders a stray "0". */}
                        {Boolean(comment.meta.commentsCount) && (
                            <button
                                className="flex items-center whitespace-nowrap hover:text-foreground transition-colors"
                                aria-expanded={!collapsed}
                                onClick={() => setCollapsed((prev) => !prev)}
                            >
                                {collapsed
                                    ? `Show ${comment.meta.commentsCount} ${comment.meta.commentsCount === 1 ? "reply" : "replies"}`
                                    : "Hide replies"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Reply input */}
                <AnimatePresence>
                    {showReplyInput && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CommentInput
                                parentId={comment._id}
                                level={level + 1}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Replies */}
                <AnimatePresence>
                    {!collapsed && Boolean(comment.meta.commentsCount) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            /* overflow-hidden: without it the children render at
                               full height while height animates from 0, so the
                               thread visibly spills and the page scroll jumps. */
                            className="space-y-3 mt-2 overflow-hidden"
                        >
                            {result.map((reply) => (
                                <CommentItem
                                    key={reply._id}
                                    commentId={reply._id}
                                    isReply={true}
                                    level={level + 1}
                                    isNew={newReplyIds.has(reply._id)}
                                />
                            ))}

                            {/* Covers both the initial expand and load-more.
                                role=status so screen readers announce it. */}
                            {isLoading && (
                                <div
                                    role="status"
                                    className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground"
                                >
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>
                                        {result.length ? "Loading more replies…" : "Loading replies…"}
                                    </span>
                                </div>
                            )}

                            {showLoadMoreComments && !isLoading && (
                                /* Bordered to match "Load more comments" and
                                   "Load More Posts" rather than reading as text. */
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadMore()}
                                    disabled={isLoading}
                                >
                                    Load more replies
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});
export default CommentItem;