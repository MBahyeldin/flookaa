// "use client";

// import type React from "react";

// import type { Post } from "./feed-page";
// import { PostCard } from "./post-card";

// interface PostListProps {
//   posts: Post[];
//   setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
// }

// export function PostList({ posts, setPosts }: PostListProps) {
//   const updatePost = (postId: string, updatedPost: Post) => {
//     setPosts(posts.map((post) => (post.id === postId ? updatedPost : post)));
//   };

//   return (
//     <div className="space-y-4">
//       {posts.map((post) => (
//         <PostCard
//           key={post.id}
//           post={post}
//           onUpdate={(updatedPost) => updatePost(post.id, updatedPost)}
//         />
//       ))}
//     </div>
//   );
// }
