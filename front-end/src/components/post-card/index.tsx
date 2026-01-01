/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { useCreateLikeMutation, type Post } from "@/generated/graphql";
import { useAuth } from "@/Auth.context";
import { PortableText as PortableTextReact } from "@portabletext/react";
import deNormalizeBlocks from "@/utils/deNormalizeBlocks";
import { useBlockObjectsProvider } from "@/BlockObjectsProvider.context";
import CommentSection from "../comment-section";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/stores/AppStore";
import useAudioContext from "@/hooks/useAudioContext";



export function Post({
  post,
}: {
  post: Post;
}) {
  const [showComments, setShowComments] = useState(false);
  const { persona } = useAuth();
  const { blockObjectsProvider } = useBlockObjectsProvider();
  const owner = useAppStore((state) => state.owner);
  const [createLike] = useCreateLikeMutation();

  const [liked, setLiked] = useState(post.personalizedMeta?.likedByPersona || false);
  const [localLikes, setLocalLikes] = useState(post.meta?.likesCount || 0);
  const [triggerHeartAnimation, setTriggerHeartAnimation] = useState(false);
  


  const toggleLike = () => {
    if (!persona?.id || !owner) return;
    setLiked((prev: boolean) => !prev);
    createLike({
      variables: {
        targetId: post._id,
        targetType: "POST",
        liked: !liked,
        owner: {
          id: owner.id,
          type: owner.type,
        },
      },
    });
  };  

  const { playSound } = useAudioContext();


  useEffect(() => {
    if (post.meta?.likesCount > localLikes) {
      playSound("HEART_REACT");
      setTriggerHeartAnimation(true);
    }
    setLocalLikes(post.meta?.likesCount || 0);
  }, [localLikes, post.meta?.likesCount]);


  const types = useMemo(() => {
    return blockObjectsProvider?.getBlockTypes() ?? [];
  }, [blockObjectsProvider]);
  const blockObjects = useMemo(() => {
    return blockObjectsProvider?.getBlockObjects() ?? [];
  }, [blockObjectsProvider]);




  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.profileImageUrl || ""} />
              <AvatarFallback>
                {post.author?.fullName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">{post.author?.fullName}</h4>
                <span className="text-sm text-muted-foreground">
                  @{post.author?.username}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{post.createdAt}</p>
            </div>
          </div>

          {post.authorId === persona?.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Post Content */}
        <div className="space-y-4">
          <PortableTextReact
            value={deNormalizeBlocks(
              JSON.parse(post.rawContent || "[]").blocks || [],
              types
            )}
            components={{
              types: blockObjects.reduce((acc, blockObject) => {
                acc[blockObject.name] = blockObject.renderBlock;
                return acc;
              }, {} as any),
            }}
          />
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLike}
              className={`relative flex items-center space-x-2 transition-all ${liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {/* Heart Icon */}
              <motion.div
                animate={liked ? "liked" : "unliked"}
                variants={{
                  liked: {
                    scale: [1, 1.3, 1],
                    rotate: [0, -10, 10, 0],
                    transition: {
                      duration: 0.4,
                      ease: "easeInOut",
                    },
                  },
                  unliked: {
                    scale: 1,
                    rotate: 0,
                  },
                }}
              >
                <Heart
                  className={`h-4 w-4 ${liked ? "fill-red-500 stroke-red-500" : "stroke-current"
                    }`}
                />
              </motion.div>

              {/* Like Count */}
              <span>{localLikes}</span>

              {/* Floating Heart Animation */}
              <AnimatePresence>
                {triggerHeartAnimation && (
                  <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                    {[...Array(6)].map((_, index) => {
                      const spread = (index - 2.5) * 10 // horizontal distance

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.6, y: 0, x: 0 }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0.6, 1.4, 1],
                            y: [-5, -20, -35],
                            x: spread,
                          }}
                          transition={{
                            duration: 1.0,
                            delay: index * 0.3, // 100ms stagger
                            ease: "easeOut",
                          }}
                          onAnimationComplete={() => {
                            if (index === 5) {
                              setTriggerHeartAnimation(false)
                            }
                          }}
                          className="absolute text-red-500"
                        >
                          <Heart className="h-5 w-5 fill-red-500 stroke-red-500" />
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(true)}
              className="flex items-center space-x-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.meta.commentsCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              {/* <span>{shares}</span> */}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(prev => !prev)}
          >
            {showComments ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
          <CommentSection parentId={post._id} showComments={showComments} totalCount={post.meta.commentsCount} />
      </CardContent>

    </Card>
  );
}
