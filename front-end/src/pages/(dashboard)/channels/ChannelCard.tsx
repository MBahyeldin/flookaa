import { useState } from "react";
import { Users, UserPlus, Heart, HeartOff, Lock, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Channel } from "@/types/channel";
import { joinChannel, leaveChannel, setFollowing as saveFollowing } from "@/services/channels";
import { toast } from "sonner";

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const [joined, setJoined] = useState(
    channel.is_member || channel.is_owner || false
  );
  const [pending, setPending] = useState(channel.is_pending || false);
  const [following, setFollowing] = useState(channel.is_follower || false);
  const isPrivate = channel.visibility === "private";
  const [localMemberCount, setLocalMemberCount] = useState(channel.members_count ?? 0);
  const [localFollowerCount, setLocalFollowerCount] = useState(channel.followers_count ?? 0);
  const [isFollowPending, setIsFollowPending] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Leaving also cancels a pending request.
    if (joined || pending) {
      const error = await leaveChannel(channel.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(pending ? "Join request cancelled" : "Successfully left channel");
      if (joined) setLocalMemberCount((prev) => Math.max(0, prev - 1));
      setJoined(false);
      setPending(false);
      return;
    }

    const result = await joinChannel(channel.id);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (result.status === "pending") {
      toast.success("Join request sent. A moderator will review it.");
      setPending(true);
      return;
    }
    toast.success("Successfully joined channel");
    setJoined(true);
    setLocalMemberCount((prev) => prev + 1);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowPending) return;
    const next = !following;
    setIsFollowPending(true);
    const error = await saveFollowing(channel.id, next);
    setIsFollowPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFollowing(next);
    setLocalFollowerCount((prev) => Math.max(0, prev + (next ? 1 : -1)));
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden pt-0">
      <div className="relative h-32 overflow-hidden">
        <Link to={`/channels/${channel.id}`}>
          <ImageWithFallback
            src={channel.thumbnail || "/placeholder.svg"}
            alt={`${channel.name} channel`}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform"
          />
        </Link>
        {channel.name && (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-black/50 text-white border-0"
          >
            {channel.name}
          </Badge>
        )}
        {isPrivate && (
          <Badge
            variant="secondary"
            className="absolute top-3 right-3 bg-black/50 text-white border-0"
          >
            <Lock className="h-3 w-3 mr-1" />
            Private
          </Badge>
        )}
      </div>

      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 line-clamp-1">{channel.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {channel.description}
            </p>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{localMemberCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>{localFollowerCount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={joined || pending ? "secondary" : "default"}
              size="sm"
              onClick={handleJoin}
              className="flex-1"
            >
              {pending ? (
                <Clock className="h-4 w-4 mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {joined
                ? "Joined"
                : pending
                  ? "Requested"
                  : isPrivate
                    ? "Request to join"
                    : "Join"}
            </Button>

            <Button
              variant={following ? "secondary" : "outline"}
              size="sm"
              onClick={handleFollow}
              disabled={isFollowPending}
              aria-label={following ? "Unfollow channel" : "Follow channel"}
              className="flex items-center space-x-1"
            >
              {following ? (
                <HeartOff className="h-4 w-4" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
