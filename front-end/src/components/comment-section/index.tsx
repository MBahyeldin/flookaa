import CommentItem from "./item"
import CommentInput from "./input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import useNewlyAdded from "@/hooks/useNewlyAdded";
import { useGetCommentsLazyQuery, type Comment, type GetCommentsQuery, type GetCommentsQueryVariables } from "@/generated/graphql";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/AppStore";
import useCustomInfiniteQuery from "@/hooks/useCustomInfinteQuery";
import { useEffect, useState } from "react";



export default function CommentSection({
    className,
    showComments,
    parentId,
    totalCount,
}: {
    className?: string;
    parentId: string;
    showComments: boolean;
    totalCount: number;
}) {
    const [showLoadMoreComments, setShowLoadMoreComments] = useState(false);
    const { loadMore, isLoading, result } = useCustomInfiniteQuery<GetCommentsQuery, GetCommentsQueryVariables, Comment[]>({
        queryFn: useGetCommentsLazyQuery()[0],
        storeSelector: (state) => state.commentsByPost[parentId] || [],
        updateStoreWithData: (data) => {
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
        if (!showComments) return;
        loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showComments]);

    // Comments that arrived after this thread was first rendered — these get
    // the entrance animation and are scrolled into view.
    const newCommentIds = useNewlyAdded(result.map((comment) => comment._id));

    if (!showComments) {
        return null;
    }

    return (

        <div className={cn("mt-6 pt-4 border-t space-y-4", className)}>
            {/* Add Comment */}
            <CommentInput parentId={parentId} level={1} />

            {/* Comments List */}
            <div className="space-y-4">
                {result.map((comment) => (
                    <CommentItem
                        key={comment._id}
                        commentId={comment._id}
                        level={2}
                        isNew={newCommentIds.has(comment._id)}
                    />
                ))}
                {/* Same inline spinner idiom as the nested reply loader */}
                {isLoading && (
                    <div
                        role="status"
                        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                    >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                            {result.length ? "Loading more comments…" : "Loading comments…"}
                        </span>
                    </div>
                )}
                {showLoadMoreComments && !isLoading && (
                    <div className="flex justify-center">
                        {/* Uses the shared outline Button so it matches
                            "Load More Posts" on the channel page. */}
                        <Button variant="outline" size="sm" onClick={loadMore}>
                            Load more comments
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}