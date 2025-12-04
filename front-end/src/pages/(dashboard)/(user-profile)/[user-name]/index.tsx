import { useEffect, useState } from "react";
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
import { useGetProfileQuery } from "@/generated/graphql";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCreator } from "@/components/post-creator";
import { joinProfile, leaveProfile } from "@/services/profiles";
import { toast } from "sonner";
import { useWebsocketService } from "@/Websocket.context";
import loadNewPosts from "./subscribe/loadNewPosts";
import handleProfileEvents from "./subscribe/handleProfileEvents";
import type { PostEventPayload } from "@/types/Ws";

export default function ProfilePage() {
  const { id: profileId } = useParams<{ id: string }>();
  const { data: profileData, updateQuery } = useGetProfileQuery({
    variables: { id: profileId },
  });
  const { websocketService } = useWebsocketService();
  const [isJoined, setIsJoined] = useState(
    profileData?.getProfile?.isMember || false
  );
  const [isFollowing, setIsFollowing] = useState(
    profileData?.getProfile?.isFollower || false
  );

  const [newPosts, setNewPosts] = useState<PostEventPayload[]>([]);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profileId) return;
    const error = isJoined
      ? await leaveProfile(profileId)
      : await joinProfile(profileId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Successfully ${isJoined ? "left" : "joined"} profile`);
    setIsJoined(!isJoined);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
  };

  const handleLoadNewPosts = () => {
    // Logic to load new posts into the main feed
    // For simplicity, we'll just clear the newPosts array here
    setNewPosts([]);
    loadNewPosts({ profileId, newPosts, updateQuery });
  }

  useEffect(() => {
    if (!websocketService || !profileId) return;

    // subscribe
    const unsubscribe = websocketService.subscribeToProfileEvents(
      Number(profileId),
      handleProfileEvents({
        setNewPosts,
        updateQuery,
      })
    );

    // cleanup on unmount or profileId change
    return () => {
      unsubscribe?.();
    };
  }, [websocketService, profileId, updateQuery]);


  if (!profileData?.getProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Back Button */}
        <Link to="/profiles">
          <Button variant="ghost" className="mb-6 flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Profiles</span>
          </Button>
        </Link>
        {/* Profile Header */}
        <Card className="mb-8 border-0 shadow-sm overflow-hidden">
          {/* Banner Image */}
          <div className="relative h-48 overflow-hidden">
            <ImageWithFallback
              src={profileData.getProfile.bannerImageUrl || ""}
              alt={`${profileData.getProfile.name} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <CardContent className="p-6">
            <div className="relative -mt-16 mb-6">
              <div className="flex items-end space-x-4">
                <div className="relative">
                  <ImageWithFallback
                    src={profileData.getProfile.thumbnailUrl || ""}
                    alt={`${profileData.getProfile.name} profile`}
                    className="w-24 h-24 rounded-2xl border-4 border-card object-cover"
                  />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-card-foreground">
                      {profileData.getProfile.name}
                    </h1>
                    <Badge variant="secondary">category</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Profile Description */}
              <p className="text-muted-foreground leading-relaxed">
                {profileData.getProfile.description}
              </p>

              {/* Profile Stats */}
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
                    src={profileData.getProfile.owner.profileImageUrl || ""}
                  />
                  <AvatarFallback>
                    <User2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {profileData.getProfile.owner.username}
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
                  <span>{isJoined ? "Joined" : "Join Profile"}</span>
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

        <PostCreator
          owner={{ id: profileData.getProfile.id, type: "CHANNEL" }}
        />

        <ProfileProvider owner={{ id: profileData.getProfile.id, type: "CHANNEL" }} updateProfileQuery={updateQuery}>
          {/* Profile Posts */}
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

            {profileData.getProfile.posts.map((post) => (
              <Post key={post._id} post={post} />
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="px-8">
              Load More Posts
            </Button>
          </div>
        </ProfileProvider>
      </div>
    </div >
  );
}
