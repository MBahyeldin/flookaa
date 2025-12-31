import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Users,
  Heart,
  Share2,
  Settings,
  UserPlus,
  HeartOff,
  // Bell,
  // BellOff,
  User2,
} from "lucide-react";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Post } from "@/components/post-card";
import { Link, useParams } from "react-router-dom";
import { useGetChannelQuery, useGetPostsLazyQuery } from "@/generated/graphql";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCreator } from "@/components/post-creator";
import { joinChannel, leaveChannel } from "@/services/channels";
import { toast } from "sonner";
import { useWebsocketService } from "@/Websocket.context";
import loadNewPosts from "./subscribe/loadNewPosts";
import handleChannelEvents from "./subscribe/handleChannelEvents";
import type { PostEventPayload } from "@/types/Ws";
import { useAppStore } from "@/stores/AppStore";

export default function ChannelPage() {
  const { id: channelId } = useParams<{ id: string }>();
  const { data: channelData } = useGetChannelQuery({
    variables: { id: channelId },
  });
  const { websocketService } = useWebsocketService();
  const [isJoined, setIsJoined] = useState(
    channelData?.getChannel?.isMember || false
  );
  const [isFollowing, setIsFollowing] = useState(
    channelData?.getChannel?.isFollower || false
  );

  const [newPosts, setNewPosts] = useState<PostEventPayload[]>([]);

  const setOwner = useAppStore((state) => state.setOwner);
  const addPosts = useAppStore((state) => state.addPosts);
  const posts = useAppStore((s) => s.posts);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadMorePosts] = useGetPostsLazyQuery();

  const handleLoadMorePosts = async () => {
    if (!channelId) return;
    const { data } = await loadMorePosts({
      variables: {
        owner: {
          id: channelId,
          type: "CHANNEL",
        },
        limit: 10,
        offset,
      },
    });
    if (data?.getPosts) {
      addPosts(data.getPosts);
      if (data.getPosts.length < 10 || (channelData?.getChannel?.totalPosts || 0) <= offset + data.getPosts.length) {
        setShowLoadMore(false);
      }
    }
    setOffset(offset + 10);
  };

  // useMemo ensures no infinite loops
  const sortedPosts = useMemo(
    () =>
      Object.values(posts).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [posts]
  );

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channelId) return;
    const error = isJoined
      ? await leaveChannel(channelId)
      : await joinChannel(channelId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Successfully ${isJoined ? "left" : "joined"} channel`);
    setIsJoined(!isJoined);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
  };

  const handleLoadNewPosts = () => {
    setNewPosts([]);
    loadNewPosts({ newPosts });
  };

  useEffect(() => {
    if (!websocketService || !channelId) return;

    // set the owner in the app store
    setOwner({
      "id": channelId,
      "type": "CHANNEL"
    });

    // subscribe
    const unsubscribe = websocketService.subscribeToChannelEvents(
      Number(channelId),
      handleChannelEvents({
        setNewPosts,
      })
    );

    // cleanup on unmount or channelId change
    return () => {
      unsubscribe?.();
    };
  }, [websocketService, channelId, setOwner]);

  useEffect(() => {
    addPosts(channelData?.getChannel?.posts || []);
    setOffset(10);
    if ((channelData?.getChannel?.totalPosts || 0) > (channelData?.getChannel?.posts.length || 0)) {
      setShowLoadMore(true);
    } else {
      setShowLoadMore(false);
    }
  }, [channelData, addPosts]);  


  if (!channelData?.getChannel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading channel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Back Button */}
        <Link to="/channels">
          <Button variant="ghost" className="mb-6 flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Channels</span>
          </Button>
        </Link>
        {/* Channel Header */}
        <Card className="mb-8 border-0 shadow-sm overflow-hidden">
          {/* Banner Image */}
          <div className="relative h-48 overflow-hidden">
            <ImageWithFallback
              src={channelData.getChannel.bannerImageUrl || ""}
              alt={`${channelData.getChannel.name} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <CardContent className="p-6">
            <div className="relative -mt-16 mb-6">
              <div className="flex items-end space-x-4">
                <div className="relative">
                  <ImageWithFallback
                    src={channelData.getChannel.thumbnailUrl || ""}
                    alt={`${channelData.getChannel.name} profile`}
                    className="w-24 h-24 rounded-2xl border-4 border-card object-cover"
                  />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-card-foreground">
                      {channelData.getChannel.name}
                    </h1>
                    <Badge variant="secondary">category</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Channel Description */}
              <p className="text-muted-foreground leading-relaxed">
                {channelData.getChannel.description}
              </p>

              {/* Channel Stats */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">200</span>
                  <span className="text-muted-foreground">members</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">300</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div className="text-muted-foreground">
                  Created on {Date.now().toLocaleString()}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-2xl">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={channelData.getChannel.owner.profileImageUrl || ""}
                  />
                  <AvatarFallback>
                    <User2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {channelData.getChannel.owner.username}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Admin
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleJoin}
                  variant={isJoined ? "secondary" : "default"}
                  className="flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{isJoined ? "Joined" : "Join Channel"}</span>
                </Button>

                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "secondary" : "outline"}
                  className="flex items-center space-x-2"
                >
                  {isFollowing ? (
                    <HeartOff className="h-4 w-4" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                  <span>{isFollowing ? "Following" : "Follow"}</span>
                </Button>
                {/* 
                <Button
                  onClick={handleNotify}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  {isNotifying ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </Button> */}

                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <PostCreator />

        {/* Channel Posts */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Posts</h2>
            <Button variant="outline" size="sm">
              Sort by Latest
            </Button>
          </div>

          {newPosts.length ? (
            <div className="p-4 bg-green-100 text-green-800 rounded-lg text-center cursor-pointer" onClick={handleLoadNewPosts}>
              {newPosts.length} new post{newPosts.length > 1 ? "s" : ""} available
            </div>
          ) : null}

          {sortedPosts.map((post) => (
            <Post key={post._id} post={post} />
          ))}
        </div>

        {/* Load More */}
        {showLoadMore &&
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="px-8" onClick={handleLoadMorePosts}>
              Load More Posts
            </Button>
          </div>
        }
      </div>
    </div >
  );
}
