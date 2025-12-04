import { useState } from "react";
import { Users, UserPlus, Heart, HeartOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Channel } from "@/types/channel";
import { joinChannel, leaveChannel } from "@/services/channels";
import { toast } from "sonner";

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const [joined, setJoined] = useState(
    channel.is_member || channel.is_owner || false
  );
  const [following, setFollowing] = useState(channel.is_follower || false);
  const [localMemberCount, setLocalMemberCount] = useState(200);
  const [, setLocalFollowerCount] = useState(300);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const error = joined
      ? await leaveChannel(channel.id)
      : await joinChannel(channel.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Successfully ${joined ? "left" : "joined"} channel`);
    setJoined(!joined);
    setLocalMemberCount((prev) => (joined ? prev - 1 : prev + 1));
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowing(!following);
    setLocalFollowerCount((prev) => (following ? prev - 1 : prev + 1));
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden pt-0">
      <div className="relative h-32 overflow-hidden">
        <Link to={`/channels/${channel.id}`}>
          <ImageWithFallback
            src={channel.thumbnail || "/placeholder.svg"}
            alt={`${name} channel`}
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
                <span>200</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={joined ? "secondary" : "default"}
              size="sm"
              onClick={handleJoin}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {joined ? "Joined" : "Join"}
            </Button>

            <Button
              variant={following ? "secondary" : "outline"}
              size="sm"
              onClick={handleFollow}
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
