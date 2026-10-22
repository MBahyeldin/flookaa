import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import { PersonRow, displayName } from "@/components/persona-link/PersonRow";
import { listMembers } from "@/services/channels";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChannelMember } from "@/types/channel";

const STRIP = 6;

function MemberAvatar({ member, className }: { member: ChannelMember; className?: string }) {
  return (
    <PersonaLink
      personaId={member.persona_id}
      anonymous={member.anonymous}
      name={displayName(member)}
      thumbnail={member.thumbnail || undefined}
      className="shrink-0 rounded-full"
    >
      <Avatar className={cn("border-2 border-background", member.anonymous && "border-dashed", className)}>
        {!member.anonymous && <AvatarImage src={member.thumbnail || ""} />}
        <GeneratedAvatarFallback name={displayName(member)} />
      </Avatar>
    </PersonaLink>
  );
}

// `version` changes on membership events, so the list follows joins and leaves.
export function ChannelPeople({ channelId, version }: { channelId: string; version: number }) {
  const [members, setMembers] = useState<ChannelMember[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setMembers(await listMembers(channelId));
    } catch {
      setFailed(true);
    }
  }, [channelId]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (failed && !members) return <ErrorState compact title="Couldn't load members" onRetry={load} />;
  if (!members) return <SkeletonList count={4} />;

  const moderators = members.filter((m) => m.is_owner || m.is_moderator);
  const rest = members.length - STRIP;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-overline font-semibold tracking-wider text-muted-foreground uppercase">People</h2>
        <div className="flex items-center">
          {members.slice(0, STRIP).map((m) => (
            <MemberAvatar key={m.persona_id} member={m} className="-me-2 size-10" />
          ))}
          {rest > 0 && <span className="ps-4 text-sm text-muted-foreground">+{formatCount(rest, "member", "members")}</span>}
        </div>
        {moderators.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Moderators</span>
            {moderators.map((m) => (
              <span key={m.persona_id} className="flex items-center gap-1.5">
                <MemberAvatar member={m} className="size-6 border-0" />
                {displayName(m)}
              </span>
            ))}
          </div>
        )}
      </div>
      <ul className="divide-y">
        {members.map((m) => (
          <PersonRow
            key={m.persona_id}
            person={m}
            detail={`Joined ${new Date(m.joined_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
            badge={m.is_owner ? "Owner" : m.is_moderator ? "Moderator" : undefined}
          />
        ))}
      </ul>
    </section>
  );
}
