import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "../ui/avatar";
import { useGetCommentsLazyQuery, type Comment, type GetCommentsQuery, type GetCommentsQueryVariables, type SimpleInput } from "@/generated/graphql";
import { ChevronDown, ChevronRight, User2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import formatDate from "@/utils/formateDate";
import useCustomInfiniteQuery from "@/hooks/useCustomInfinteQuery";
import { useAppStore } from "@/stores/AppStore";
import CommentInput from "./input";

const CommentItem = React.memo(({
    commentId,
    isReply = false,
    level,
}: {
    commentId: string;
    isReply?: boolean;
    level: number;
}) => {
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
            console.log({
                data, useAppStore: useAppStore.getState(),
            });

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
    }, [collapsed]);



    if (!comment || !comment.author) return null;


    return (
        <div className={`relative flex space-x-3 ${isReply ? "ml-10 mt-4" : "mt-6"}`}>
            {/* Dashed vertical line for replies */}
            {isReply && (
                <div className="absolute -left-5 -top-4 bottom-0 border-l border-dashed border-muted-foreground/40"></div>
            )}

            {/* Avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage
                    src={comment.author?.profileImageUrl ?? ""}
                    className="h-8 w-8 rounded-full"
                />
                <AvatarFallback>
                    <User2 className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 space-y-2">
                <div className="bg-muted rounded-2xl px-4 py-2 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{comment.author.fullName}</span>
                        <span className="text-xs text-muted-foreground">@{comment.author.username}</span>
                    </div>
                    {
                        commentContent.type === "TEXT" ? (
                            <p className="text-sm text-foreground">{commentContent.content}</p>
                        ) : commentContent.type === "MEDIA" ? (
                            <img src={commentContent.content} alt="Media content" className="rounded-md max-w-[300px]" />
                        ) : commentContent.type === "VOICE" ? (
                            <audio controls className="w-full">
                                <source src={commentContent.content} />
                                Your browser does not support the audio element.
                            </audio>
                        ) : null

                    }
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-4 text-xs text-muted-foreground px-4">
                    {comment.meta.commentsCount ? <button
                        className="flex items-center space-x-1 hover:text-foreground transition-colors cursor-pointer"
                        onClick={() => setCollapsed((prev) => !prev)}
                    >
                        {collapsed ? (
                            <>
                                <ChevronRight className="h-3 w-3" />
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-3 w-3" />
                            </>
                        )}
                    </button>
                        : null}
                    <span>{formatedDate}</span>
                    <button className="hover:text-foreground transition-colors">Like</button>
                    <button
                        className="hover:text-foreground transition-colors"
                        onClick={() => setShowReplyInput((prev) => !prev)}
                    >
                        Reply
                    </button>
                    {comment.meta.commentsCount && comment.meta.commentsCount > 0 && (
                        <button
                            className="flex items-center space-x-1 hover:text-foreground transition-colors"
                            onClick={() => setCollapsed((prev) => !prev)}
                        >
                            {collapsed ? (
                                <>
                                    <span>Show {comment.meta.commentsCount} replies</span>
                                </>
                            ) : (
                                <>
                                    <span>Hide replies</span>
                                </>
                            )}
                        </button>
                    )}
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
                    {!collapsed && comment.meta.commentsCount && comment.meta.commentsCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-3 mt-2"
                        >
                            {result.map((comment) => (
                                <CommentItem
                                    key={comment._id}
                                    commentId={comment._id}
                                    isReply={true}
                                    level={level + 1}
                                />
                            ))}
                            {showLoadMoreComments && (
                                <button
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => loadMore()}
                                    disabled={isLoading}
                                >
                                    Load more
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});
export default CommentItem;