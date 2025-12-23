import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Post, Comment, Owner } from "@/generated/graphql";

export interface AppState {
  owner: Owner | null;
  setOwner: (owner: Owner) => void;

  posts: Record<string, Post>;
  comments: Record<string, Comment>;

  commentsByPost: Record<string, string[]>;
  commentsByComment: Record<string, string[]>;

  addPost: (post: Post) => void;
  addCommentToPost: (comment: Comment) => void;
  addCommentToComment: (comment: Comment) => void;

  addPosts: (posts: Post[]) => void;
  addCommentsToPost: (postId: string, comments: Comment[]) => void;
  addCommentsToComment: (commentId: string, comments: Comment[]) => void;

  addOrRemoveLike: (targetType: "POST" | "COMMENT", targetId: string, inc: number) => void;
}

export const useAppStore = create(
  immer<AppState>((set) => ({
    owner: null,
    posts: {},
    comments: {},
    replies: {},

    commentsByPost: {},
    commentsByComment: {},

    setOwner: (owner) =>
      set((s) => {
        s.owner = owner;
      }),

    addPost: (post) =>
      set((s) => {
        s.posts[post._id] = post;
        s.commentsByPost[post._id] ??= [];
      }),

    addCommentToPost: (comment) =>
      set((s) => {
        s.comments[comment._id] = comment;
        (s.commentsByPost[comment.parentId] ??= []).push(comment._id);
        s.commentsByComment[comment._id] ??= [];
        s.posts[comment.parentId].meta.commentsCount += 1;
      }),

    addCommentToComment: (comment) =>
      set((s) => {
        s.comments[comment._id] = comment;
        (s.commentsByComment[comment.parentId] ??= []).push(comment._id);
        s.commentsByComment[comment._id] ??= [];
        s.comments[comment.parentId].meta.commentsCount ??= 0;
        s.comments[comment.parentId].meta.commentsCount += 1;
      }),

    addPosts: (posts) =>
      set((state) => {
        for (const post of posts) {
          state.posts[post._id] = post;
          state.commentsByPost[post._id] ??= [];
        }
      }),

    addCommentsToPost: (postId, comments) =>
      set((state) => {
        const list = (state.commentsByPost[postId] ??= []);
        for (const comment of comments) {
          state.comments[comment._id] = comment;
          if (!list.includes(comment._id)) list.push(comment._id);
          state.commentsByComment[comment._id] ??= [];
        }
      }),

    addCommentsToComment: (commentId, comments) =>
      set((state) => {
        const list = (state.commentsByComment[commentId] ??= []);
        for (const comment of comments) {
          state.comments[comment._id] = comment;
          if (!list.includes(comment._id)) list.push(comment._id);
          state.commentsByComment[comment._id] ??= [];
        }
      }),

    addOrRemoveLike: (targetType, targetId, inc) =>
      set((state) => {
        if (targetType === "POST") {
          const post = state.posts[targetId];
          if (post) {            
            post.meta.likesCount = (post.meta.likesCount ?? 0) + inc;
          } else {
            console.warn("Post not found in store for like update:", targetId);
          }
        } else if (targetType === "COMMENT") {
          const comment = state.comments[targetId];
          if (comment) {
            comment.meta.likesCount = (comment.meta.likesCount ?? 0) + inc;
          }
        }
      }),
  }))
);
