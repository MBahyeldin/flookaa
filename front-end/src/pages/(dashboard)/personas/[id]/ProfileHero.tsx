import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Ellipsis, Link2, Lock, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Hero } from "@/components/hero";
import { Cover } from "@/components/cover";
import { FollowButton } from "@/components/follow-button";
import { InviteButton } from "@/components/invite-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LockedPersona, PersonaProfile } from "@/types/persona";

export const fullName = (p: { first_name: string; last_name: string }) => `${p.first_name} ${p.last_name}`.trim();

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link");
  }
};

function PersonaAvatar({ name, src, locked }: { name: string; src?: string; locked?: boolean }) {
  const ring = locked
    ? "border-2 border-dashed border-border bg-muted"
    : "ring-4 ring-background";
  const fallback = (
    <AvatarFallback className={cn(locked && "bg-muted text-muted-foreground")}>{initials(name)}</AvatarFallback>
  );
  return (
    <>
      <Avatar className={cn("size-20 text-2xl md:hidden", ring)}>
        {src && <AvatarImage src={src} />}
        {fallback}
      </Avatar>
      <Avatar className={cn("size-[100px] text-[32px] max-md:hidden", ring)}>
        {src && <AvatarImage src={src} />}
        {fallback}
      </Avatar>
    </>
  );
}

function MoreMenu({ children }: { children?: ReactNode }) {
  return (
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
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProfileHero({
  persona,
  isOwn,
  onFollowersClick,
  onShareFollowLink,
  onChange,
}: {
  persona: PersonaProfile;
  isOwn: boolean;
  onFollowersClick: () => void;
  onShareFollowLink: () => void;
  onChange: () => void;
}) {
  const name = fullName(persona);
  const isPrivate = persona.privacy !== "public";

  const followers = formatCount(persona.followers_count, "follower", "followers");
  const following = `${persona.following_count} following`;

  return (
    <Hero
      cover={<Cover pattern={persona.cover_pattern} />}
      media={<PersonaAvatar name={name} src={persona.thumbnail} />}
      tags={
        <>
          <Badge variant="secondary">@{persona.slug}</Badge>
          {isPrivate && (
            <Badge variant="secondary">
              <Lock />
              Private
            </Badge>
          )}
        </>
      }
      name={name}
      tagline={persona.bio}
      facts={
        isOwn ? (
          <>
            <button
              type="button"
              className="cursor-pointer rounded-sm hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              onClick={onFollowersClick}
            >
              {followers}
            </button>
            {" · "}
            {following}
          </>
        ) : (
          <>
            {followers} · {following}
          </>
        )
      }
      actions={
        <>
          {!isOwn && persona.followable && (
            <FollowButton
              personaId={persona.id}
              name={name}
              status={persona.follow_status ?? null}
              requiresApproval={persona.requires_approval}
              size="default"
              onChange={onChange}
            />
          )}
          {!isOwn && persona.can_invite && (
            <InviteButton
              personaId={persona.id}
              name={name}
              status={persona.invite_status ?? null}
              size="default"
              onChange={onChange}
            />
          )}
          <MoreMenu>
            {isOwn && persona.privacy === "private" && (
              <DropdownMenuItem onSelect={onShareFollowLink}>
                <Share2 />
                Share follow link
              </DropdownMenuItem>
            )}
            {isOwn && (
              <DropdownMenuItem asChild>
                <Link to={`/persona-manager/${persona.id}`}>
                  <Pencil />
                  Edit persona
                </Link>
              </DropdownMenuItem>
            )}
          </MoreMenu>
        </>
      }
    />
  );
}

// Kept in the viewer's palette: nothing about the persona shows.
export function LockedProfileHero({ persona, onChange }: { persona: LockedPersona; onChange: () => void }) {
  return (
    <Hero
      cover={<Cover pattern="stripes" />}
      media={<PersonaAvatar name={persona.anonymous_name} locked />}
      tags={
        <Badge variant="secondary">
          <Lock />
          Private
        </Badge>
      }
      name={persona.anonymous_name}
      tagline="This persona is private."
      facts="Request to follow to see their profile and posts."
      actions={
        <>
          <FollowButton
            personaId={persona.id}
            status={persona.follow_status ?? null}
            requiresApproval
            followLabel="Request to follow"
            size="default"
            onChange={onChange}
          />
          <MoreMenu />
        </>
      }
    />
  );
}
