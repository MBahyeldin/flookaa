import CommentItem from "./item"
import CommentInput from "./input";
import { Button } from "../ui/button";
import { Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { SkeletonList } from "../ui/skeleton";
import { EmptyState } from "../ui/empty-state";
import { ErrorState } from "../ui/error-state";
import useNewlyAdded from "@/hooks/useNewlyAdded";
import { useGetCommentsLazyQuery, type Comment, type GetCommentsQuery, type GetCommentsQueryVariables } from "@/generated/graphql";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/AppStore";
import useCustomInfiniteQuery from "@/hooks/useCustomInfinteQuery";
import { useEffect, useState, type ReactNode } from "react";

export default function CommentSection({
    className,
    parentId,
    totalCount,
    composer,
}: {
    className?: string;
    parentId: string;
    totalCount: number;
    /** Replaces the comment box, e.g. a join prompt for a reader who can't comment. */
    composer?: ReactNode;
}) {
    const [showLoadMoreComments, setShowLoadMoreComments] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const { loadMore, isLoading, error, result } = useCustomInfiniteQuery<GetCommentsQuery, GetCommentsQueryVariables, Comment[]>({
        queryFn: useGetCommentsLazyQuery()[0],
        storeSelector: (state) => state.commentsByPost[parentId] || [],
        updateStoreWithData: (data) => {
            setLoaded(true);
            if (!data?.getComments) return;
            const addCommentsToPost = useAppStore.getState().addCommentsToPost;
            addCommentsToPost(parentId, data.getComments);
            if ((data?.getComments?.length || 0) + result.length < totalCount) {
                setShowLoadMoreComments(true);
            } else {
                setShowLoadMoreComments(false);
            }
        },
        optionVariables: {
            variables: {
                parentId,
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
        loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Comments that arrived after this thread was first rendered — these get
    // the entrance animation and are scrolled into view.
    const newCommentIds = useNewlyAdded(result.map((comment) => comment._id));

    return (
        <section aria-labelledby="comments" className={cn("flex flex-col gap-5", className)}>
            <h2 id="comments" className="scroll-mt-24 text-h4 font-medium">
                {totalCount} {totalCount === 1 ? "comment" : "comments"}
            </h2>

            {composer ?? <CommentInput parentId={parentId} level={1} />}

            <div className="flex flex-col gap-5">
                {result.map((comment) => (
                    <CommentItem
                        key={comment._id}
                        commentId={comment._id}
                        level={2}
                        depth={1}
                        isNew={newCommentIds.has(comment._id)}
                    />
                ))}
                {result.length === 0 && isLoading && <SkeletonList count={3} />}
                {result.length === 0 && error && !isLoading && (
                    <ErrorState
                        icon={RefreshCw}
                        title="Comments didn't load"
                        body="Check your connection and try again."
                        onRetry={loadMore}
                    />
                )}
                {result.length === 0 && loaded && !error && !isLoading && (
                    <EmptyState
                        icon={MessageCircle}
                        title="No comments yet"
                        body="Start the conversation. Your comment shows as the persona you're using."
                    />
                )}
                {result.length > 0 && isLoading && (
                    <div
                        role="status"
                        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                    >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading more comments…</span>
                    </div>
                )}
                {result.length > 0 && error && !isLoading && (
                    <div role="alert" className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        Couldn't load more comments.
                        <Button variant="outline" size="sm" onClick={loadMore}>
                            Try again
                        </Button>
                    </div>
                )}
                {showLoadMoreComments && !isLoading && !error && (
                    <Button variant="outline" className="w-full" onClick={loadMore}>
                        Load more comments
                    </Button>
                )}
            </div>
        </section>
    )
}
