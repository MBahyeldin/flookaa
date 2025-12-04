import CommentItem from "./item"
import CommentInput from "./input";
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
    }, [showComments]);

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
                    <CommentItem key={comment._id} commentId={comment._id} level={2} />
                ))}
                {isLoading && (
                    <div className="flex justify-center">
                        <span className="text-sm text-muted-foreground">Loading comments...</span>
                    </div>
                )}
                {showLoadMoreComments && (
                    <div className="flex justify-center">
                        <button
                            onClick={loadMore}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Load more comments
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}