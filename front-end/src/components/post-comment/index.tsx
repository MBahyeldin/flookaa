// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Textarea } from "@/components/ui/textarea"
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { Heart, MessageCircle } from "lucide-react"
// import type { Comment, Post, Reply } from "./feed-page"
// import { cn } from "@/lib/utils"

// interface CommentsSectionProps {
//   comments: Comment[]
//   onNewComment: (content: string) => void
//   onUpdatePost: (post: Post) => void
//   post: Post
// }

// export function CommentsSection({ comments, onNewComment, onUpdatePost, post }: CommentsSectionProps) {
//   const [newComment, setNewComment] = useState("")
//   const [replyingTo, setReplyingTo] = useState<string | null>(null)
//   const [replyContent, setReplyContent] = useState("")

//   const handleSubmitComment = () => {
//     if (newComment.trim()) {
//       onNewComment(newComment.trim())
//       setNewComment("")
//     }
//   }

//   const handleLikeComment = (commentId: string) => {
//     const updatedComments = comments.map((comment) => {
//       if (comment.id === commentId) {
//         return {
//           ...comment,
//           isLiked: !comment.isLiked,
//           reactions: {
//             ...comment.reactions,
//             likes: comment.isLiked ? comment.reactions.likes - 1 : comment.reactions.likes + 1,
//           },
//         }
//       }
//       return comment
//     })

//     onUpdatePost({ ...post, comments: updatedComments })
//   }

//   const handleReply = (commentId: string) => {
//     if (replyContent.trim()) {
//       const newReply: Reply = {
//         id: Date.now().toString(),
//         author: {
//           name: "You",
//           username: "@you",
//           avatar: "/diverse-user-avatars.png",
//         },
//         content: replyContent.trim(),
//         timestamp: "now",
//         reactions: { likes: 0 },
//         isLiked: false,
//       }

//       const updatedComments = comments.map((comment) => {
//         if (comment.id === commentId) {
//           return {
//             ...comment,
//             replies: [...comment.replies, newReply],
//           }
//         }
//         return comment
//       })

//       onUpdatePost({ ...post, comments: updatedComments })
//       setReplyContent("")
//       setReplyingTo(null)
//     }
//   }

//   const handleLikeReply = (commentId: string, replyId: string) => {
//     const updatedComments = comments.map((comment) => {
//       if (comment.id === commentId) {
//         const updatedReplies = comment.replies.map((reply) => {
//           if (reply.id === replyId) {
//             return {
//               ...reply,
//               isLiked: !reply.isLiked,
//               reactions: {
//                 ...reply.reactions,
//                 likes: reply.isLiked ? reply.reactions.likes - 1 : reply.reactions.likes + 1,
//               },
//             }
//           }
//           return reply
//         })
//         return { ...comment, replies: updatedReplies }
//       }
//       return comment
//     })

//     onUpdatePost({ ...post, comments: updatedComments })
//   }

//   return (
//     <div className="border-t border-border bg-muted/20">
//       {/* New Comment Input */}
//       <div className="p-4 border-b border-border">
//         <div className="flex gap-3">
//           <Avatar className="h-8 w-8">
//             <AvatarImage src="/diverse-user-avatars.png" />
//             <AvatarFallback className="bg-muted text-muted-foreground text-xs">You</AvatarFallback>
//           </Avatar>
//           <div className="flex-1 space-y-2">
//             <Textarea
//               placeholder="Write a comment..."
//               value={newComment}
//               onChange={(e) => setNewComment(e.target.value)}
//               className="min-h-[60px] resize-none bg-background border-border"
//             />
//             <div className="flex justify-end">
//               <Button
//                 onClick={handleSubmitComment}
//                 disabled={!newComment.trim()}
//                 size="sm"
//                 className="bg-primary hover:bg-primary/90 text-primary-foreground"
//               >
//                 Comment
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Comments List */}
//       <div className="max-h-96 overflow-y-auto">
//         {comments.map((comment) => (
//           <div key={comment.id} className="p-4 border-b border-border last:border-b-0">
//             {/* Comment */}
//             <div className="flex gap-3">
//               <Avatar className="h-8 w-8">
//                 <AvatarImage src={comment.author.avatar || "/placeholder.svg"} />
//                 <AvatarFallback className="bg-muted text-muted-foreground text-xs">
//                   {comment.author.name.charAt(0)}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="flex-1">
//                 <div className="flex items-center gap-2 mb-1">
//                   <span className="font-medium text-sm text-foreground">{comment.author.name}</span>
//                   <span className="text-xs text-muted-foreground">{comment.author.username}</span>
//                   <span className="text-xs text-muted-foreground">·</span>
//                   <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
//                 </div>
//                 <p className="text-sm text-foreground mb-2">{comment.content}</p>
//                 <div className="flex items-center gap-4">
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => handleLikeComment(comment.id)}
//                     className={cn(
//                       "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-6 px-2",
//                       comment.isLiked && "text-red-500 hover:text-red-600",
//                     )}
//                   >
//                     <Heart className={cn("h-3 w-3", comment.isLiked && "fill-current")} />
//                     <span>{comment.reactions.likes}</span>
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
//                     className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-6 px-2"
//                   >
//                     <MessageCircle className="h-3 w-3" />
//                     Reply
//                   </Button>
//                 </div>

//                 {/* Reply Input */}
//                 {replyingTo === comment.id && (
//                   <div className="mt-3 flex gap-2">
//                     <Avatar className="h-6 w-6">
//                       <AvatarImage src="/diverse-user-avatars.png" />
//                       <AvatarFallback className="bg-muted text-muted-foreground text-xs">You</AvatarFallback>
//                     </Avatar>
//                     <div className="flex-1 space-y-2">
//                       <Textarea
//                         placeholder={`Reply to ${comment.author.name}...`}
//                         value={replyContent}
//                         onChange={(e) => setReplyContent(e.target.value)}
//                         className="min-h-[40px] text-sm resize-none bg-background border-border"
//                       />
//                       <div className="flex gap-2">
//                         <Button
//                           onClick={() => handleReply(comment.id)}
//                           disabled={!replyContent.trim()}
//                           size="sm"
//                           className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
//                         >
//                           Reply
//                         </Button>
//                         <Button
//                           onClick={() => {
//                             setReplyingTo(null)
//                             setReplyContent("")
//                           }}
//                           variant="ghost"
//                           size="sm"
//                           className="h-7 text-xs text-muted-foreground hover:text-foreground"
//                         >
//                           Cancel
//                         </Button>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Replies */}
//                 {comment.replies.length > 0 && (
//                   <div className="mt-3 space-y-3">
//                     {comment.replies.map((reply) => (
//                       <div key={reply.id} className="flex gap-2 pl-4 border-l-2 border-border">
//                         <Avatar className="h-6 w-6">
//                           <AvatarImage src={reply.author.avatar || "/placeholder.svg"} />
//                           <AvatarFallback className="bg-muted text-muted-foreground text-xs">
//                             {reply.author.name.charAt(0)}
//                           </AvatarFallback>
//                         </Avatar>
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2 mb-1">
//                             <span className="font-medium text-xs text-foreground">{reply.author.name}</span>
//                             <span className="text-xs text-muted-foreground">{reply.author.username}</span>
//                             <span className="text-xs text-muted-foreground">·</span>
//                             <span className="text-xs text-muted-foreground">{reply.timestamp}</span>
//                           </div>
//                           <p className="text-xs text-foreground mb-1">{reply.content}</p>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => handleLikeReply(comment.id, reply.id)}
//                             className={cn(
//                               "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-5 px-1",
//                               reply.isLiked && "text-red-500 hover:text-red-600",
//                             )}
//                           >
//                             <Heart className={cn("h-2.5 w-2.5", reply.isLiked && "fill-current")} />
//                             <span>{reply.reactions.likes}</span>
//                           </Button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }
