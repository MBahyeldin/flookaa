import { Link } from "react-router-dom";
import { Check, Clock, Ellipsis, Globe, Link2, Lock, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { Hero } from "@/components/hero";
import { Cover } from "@/components/cover";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgeBadge } from "@/components/age-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCount } from "@/lib/format";
import type { CoverPattern } from "@/types/cover";

export type HeroChannel = {
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  coverPattern: CoverPattern;
  isPrivate: boolean;
  isOwner: boolean;
  minAge: number;
};

export function ChannelHero({
  channel,
  community,
  membersCount,
  followersCount,
  isJoined,
  isPending,
  isFollowing,
  busy,
  canModerate,
  onJoin,
  onFollow,
  onManage,
  onMembers,
}: {
  channel: HeroChannel;
  community: { name: string; slug: string } | null | undefined;
  membersCount: number;
  followersCount: number;
  isJoined: boolean;
  isPending: boolean;
  isFollowing: boolean;
  busy: "join" | "follow" | null;
  canModerate: boolean;
  onJoin: () => void;
  onFollow: () => void;
  onManage: () => void;
  onMembers: () => void;
}) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const joinButton = channel.isOwner ? null : isJoined ? (
    <Button variant="secondary" className="flex-1 md:flex-none" loading={busy === "join"} disabled={!!busy} onClick={onJoin}>
      <Check />
      Joined
    </Button>
  ) : isPending ? (
    <Button variant="outline" className="flex-1 md:flex-none" loading={busy === "join"} disabled={!!busy} onClick={onJoin}>
      <Clock />
      Requested
    </Button>
  ) : (
    <Button className="flex-1 md:flex-none" loading={busy === "join"} disabled={!!busy} onClick={onJoin}>
      {channel.isPrivate ? "Request to join" : "Join channel"}
    </Button>
  );

  return (
    <Hero
      cover={<Cover pattern={channel.coverPattern} />}
      media={
        <>
          <Logo name={channel.name} src={channel.thumbnailUrl} size="lg" className="md:hidden" />
          <Logo name={channel.name} src={channel.thumbnailUrl} size="xl" className="max-md:hidden" />
        </>
      }
      tags={
        <>
          <Badge variant="secondary">
            {channel.isPrivate ? <Lock /> : <Globe />}
            {channel.isPrivate ? "Private" : "Public"}
          </Badge>
          <AgeBadge minAge={channel.minAge} />
        </>
      }
      name={channel.name}
      tagline={channel.description}
      facts={
        <>
          {formatCount(membersCount, "member", "members")} · {formatCount(followersCount, "follower", "followers")}
          {community && (
            <>
              {" · Part of "}
              <Link to={`/communities/${community.slug}`} className="rounded-sm text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {community.name}
              </Link>
            </>
          )}
        </>
      }
      actions={
        <>
          {joinButton}
          <Button variant="outline" className="flex-1 md:flex-none" loading={busy === "follow"} disabled={!!busy} onClick={onFollow}>
            {isFollowing ? "Following" : "Follow"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions" title="More actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={copyLink}>
                <Link2 />
                Copy link
              </DropdownMenuItem>
              {canModerate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onManage}>
                    <Settings />
                    Manage
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onMembers}>
                    <Users />
                    Members & requests
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
