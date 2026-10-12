import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FollowButton } from "@/components/follow-button";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { InviteButton } from "@/components/invite-button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPersonaProfile } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type {
  FollowStatus,
  InviteStatus,
  LockedPersona,
  PersonaProfile,
} from "@/types/persona";

type Fetched = PersonaProfile | LockedPersona | "not_found" | null;

export function PersonaCard({
  personaId,
  name,
  thumbnail,
  anonymous,
  profilePath,
  onNavigate,
}: {
  personaId: number;
  name: string;
  thumbnail?: string;
  anonymous: boolean;
  profilePath: string;
  onNavigate: () => void;
}) {
  const viewerId = useUserProfileStore((s) => s.persona?.id);
  const [fetched, setFetched] = useState<Fetched | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchPersonaProfile(String(personaId)).then((p) => {
      if (!cancelled) setFetched(p);
    });
    return () => {
      cancelled = true;
    };
  }, [personaId]);

  const isOwn = String(personaId) === String(viewerId);
  const full =
    fetched &&
    fetched !== "loading" &&
    fetched !== "not_found" &&
    !fetched.locked
      ? fetched
      : null;
  const locked =
    fetched &&
    fetched !== "loading" &&
    fetched !== "not_found" &&
    fetched.locked
      ? fetched
      : null;

  const displayName = full
    ? `${full.first_name} ${full.last_name}`.trim()
    : name;
  const image = full ? full.thumbnail : anonymous ? undefined : thumbnail;

  const setStatus = (follow_status: FollowStatus) =>
    setFetched((f) =>
      f && f !== "loading" && f !== "not_found" ? { ...f, follow_status } : f,
    );
  const setInvite = (status: InviteStatus | "following") =>
    setFetched((f) =>
      f && f !== "loading" && f !== "not_found" && !f.locked
        ? status === "following"
          ? { ...f, invite_status: null, can_invite: false }
          : { ...f, invite_status: status }
        : f,
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={image || ""} />
          <GeneratedAvatarFallback name={displayName} />
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName}</p>
          {full && (
            <p className="truncate text-xs text-muted-foreground">
              @{full.slug}
            </p>
          )}
        </div>
      </div>

      {fetched === "loading" && !isOwn && <Skeleton className="h-8 w-24" />}

      <div className="flex flex-wrap items-center gap-2">
        {!isOwn && full?.followable && (
          <FollowButton
            personaId={personaId}
            name={displayName}
            status={full.follow_status ?? null}
            requiresApproval={full.requires_approval}
            onChange={setStatus}
          />
        )}
        {!isOwn && full?.can_invite && (
          <InviteButton
            personaId={personaId}
            name={displayName}
            status={full.invite_status ?? null}
            onChange={setInvite}
          />
        )}
        {!isOwn && locked && (
          <FollowButton
            personaId={personaId}
            status={locked.follow_status ?? null}
            requiresApproval
            followLabel="Request to follow"
            onChange={setStatus}
          />
        )}
        {full && (
          <Button asChild size="sm" variant="outline">
            <Link to={profilePath} onClick={onNavigate}>
              View profile
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
