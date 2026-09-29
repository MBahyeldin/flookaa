import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Post, Comment, Owner } from "@/generated/graphql";

type OwnerRef = Pick<Owner, "id" | "type">;

const sameOwner = (a: OwnerRef | null, b: OwnerRef | null) =>
  !!a && !!b && a.type === b.type && String(a.id) === String(b.id);

/**
 * The store holds the state of the page being viewed (a channel, a profile…),
 * identified by `owner`. Everything here is dropped when the owner changes.
 */
const emptyPageState = () => ({
  owner: null as Owner | null,
  posts: {} as Record<string, Post>,
  comments: {} as Record<string, Comment>,
  commentsByPost: {} as Record<string, string[]>,
  commentsByComment: {} as Record<string, string[]>,
  canModerate: false,
  deletedIds: {} as Record<string, true>,
});

export interface AppState {
  owner: Owner | null;
  setOwner: (owner: Owner) => void;
  resetPage: () => void;

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

  canModerate: boolean;
  setCanModerate: (canModerate: boolean) => void;

  deletedIds: Record<string, true>;
  removePost: (postId: string) => void;
  removeComment: (commentId: string, parentId: string, parentType: "POST" | "COMMENT") => void;
}

export const useAppStore = create(
  immer<AppState>((set) => ({
    ...emptyPageState(),

    setOwner: (owner) =>
      set((s) => {
        if (sameOwner(s.owner, owner)) return;
        Object.assign(s, emptyPageState());
        s.owner = owner;
      }),

    resetPage: () =>
      set((s) => {
        Object.assign(s, emptyPageState());
      }),

    addPost: (post) =>
      set((s) => {
        s.posts[post._id] = post;
        s.commentsByPost[post._id] ??= [];
      }),

    // The parent checks below drop events and fetches that belong to a page
    // the user has already left (or a thread that was never loaded).
    addCommentToPost: (comment) =>
      set((s) => {
        const post = s.posts[comment.parentId];
        if (!post) return;
        s.comments[comment._id] = comment;
        (s.commentsByPost[comment.parentId] ??= []).push(comment._id);
        s.commentsByComment[comment._id] ??= [];
        post.meta.commentsCount = (post.meta.commentsCount ?? 0) + 1;
      }),

    addCommentToComment: (comment) =>
      set((s) => {
        if (!s.comments[comment.parentId]) return;
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
        if (!state.posts[postId]) return;
        const list = (state.commentsByPost[postId] ??= []);
        for (const comment of comments) {
          state.comments[comment._id] = comment;
          if (!list.includes(comment._id)) list.push(comment._id);
          state.commentsByComment[comment._id] ??= [];
        }
      }),

    addCommentsToComment: (commentId, comments) =>
      set((state) => {
        if (!state.comments[commentId]) return;
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

    setCanModerate: (canModerate) =>
      set((s) => {
        s.canModerate = canModerate;
      }),

    removePost: (postId) =>
      set((s) => {
        if (s.deletedIds[postId]) return;
        s.deletedIds[postId] = true;
        delete s.posts[postId];
        delete s.commentsByPost[postId];
      }),

    removeComment: (commentId, parentId, parentType) =>
      set((s) => {
        if (s.deletedIds[commentId]) return;
        s.deletedIds[commentId] = true;
        delete s.comments[commentId];
        delete s.commentsByComment[commentId];
        const siblings =
          parentType === "POST" ? s.commentsByPost[parentId] : s.commentsByComment[parentId];
        if (siblings) {
          const i = siblings.indexOf(commentId);
          if (i !== -1) siblings.splice(i, 1);
        }
        const parent = parentType === "POST" ? s.posts[parentId] : s.comments[parentId];
        if (parent) {
          parent.meta.commentsCount = Math.max(0, (parent.meta.commentsCount ?? 0) - 1);
        }
      }),
  }))
);

/** True if the store still holds this owner's page — check after an await before writing. */
export const isCurrentOwner = (owner: OwnerRef) =>
  sameOwner(useAppStore.getState().owner, owner);
