import type { Post } from "@/generated/graphql";
import { createContext, useContext } from "react";

type PostContextType = {
    post: Post;
};

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({
    post,
    children
}: {
    post: Post;
    children: React.ReactNode
}) {
    return (
        <PostContext.Provider
            value={{
                post,
            }}
        >
            {children}
        </PostContext.Provider>
    );
}

export function usePost() {
    const ctx = useContext(PostContext);
    if (!ctx) throw new Error("usePost must be used inside PostProvider");
    return ctx;
}
