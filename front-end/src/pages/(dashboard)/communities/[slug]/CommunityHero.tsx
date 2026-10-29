import { Check, Clock, Ellipsis, Globe, Link2, Lock, Plus, Send, Settings, Users } from "lucide-react";
import { Link } from "react-router-dom";
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
import type { Community } from "@/types/community";

const factLink =
  "cursor-pointer rounded-sm hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring";

export function CommunityHero({
  community,
  canSeeInside,
  canSuggest,
  busy,
  onJoin,
  onLeave,
  onFollow,
  onMembers,
  onManage,
  onSuggest,
}: {
  community: Community;
  canSeeInside: boolean;
  canSuggest: boolean;
  busy: "join" | "follow" | null;
  onJoin: () => void;
  onLeave: () => void;
  onFollow: () => void;
  onMembers: () => void;
  onManage: () => void;
  onSuggest: () => void;
}) {
  const isPrivate = community.visibility === "private";
  const status = community.membership_status;
  const members = formatCount(community.members_count, "member", "members");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const joinProps = { className: "flex-1 md:flex-none", loading: busy === "join", disabled: !!busy };
  const joinButton = community.is_owner ? null : status === "active" ? (
    <Button variant="secondary" {...joinProps} onClick={onLeave}>
      <Check />
      Joined
    </Button>
  ) : status === "pending" ? (
    <Button variant="outline" {...joinProps} onClick={onLeave}>
      <Clock />
      Requested
    </Button>
  ) : status === "rejected" ? (
    <Button variant="outline" className="flex-1 md:flex-none" disabled>
      Request declined
    </Button>
  ) : (
    <Button {...joinProps} onClick={onJoin}>
      {isPrivate ? "Request to join" : "Join community"}
    </Button>
  );

  return (
    <Hero
      cover={<Cover pattern={community.cover_pattern} />}
      media={
        <>
          <Logo name={community.name} src={community.thumbnail} size="lg" className="md:hidden" />
          <Logo name={community.name} src={community.thumbnail} size="xl" className="max-md:hidden" />
        </>
      }
      tags={
        <>
          <Badge variant="secondary">
            {isPrivate ? <Lock /> : <Globe />}
            {isPrivate ? "Private" : "Public"}
          </Badge>
          <AgeBadge minAge={community.min_age} />
        </>
      }
      name={community.name}
      tagline={community.description}
      facts={
        <>
          {canSeeInside ? (
            <button type="button" className={factLink} onClick={onMembers}>
              {members}
            </button>
          ) : (
            members
          )}
          {!isPrivate && ` · ${formatCount(community.followers_count, "follower", "followers")}`}
          {` · ${formatCount(community.channels_count, "channel", "channels")}`}
        </>
      }
      actions={
        <>
          {joinButton}
          {!isPrivate && (
            <Button
              variant="outline"
              className="flex-1 md:flex-none"
              loading={busy === "follow"}
              disabled={!!busy}
              onClick={onFollow}
            >
              {community.following ? "Following" : "Follow"}
            </Button>
          )}
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
              {canSuggest && (
                <DropdownMenuItem onSelect={onSuggest}>
                  <Send />
                  Suggest a channel
                </DropdownMenuItem>
              )}
              {community.can_manage && (
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
                  <DropdownMenuItem asChild>
                    <Link to={`/channels/create?community=${community.id}`}>
                      <Plus />
                      Create channel
                    </Link>
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
