import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { PeopleStrip } from "@/components/people-strip";
import { overlineClass } from "@/components/about-block";
import { listCommunityMembers } from "@/services/communities";
import { formatCount } from "@/lib/format";
import type { Community, CommunityMember } from "@/types/community";

// Owner and moderators sort first, so one page covers the moderators line.
const PAGE = 50;

/** `version` changes on count and moderator events. */
export function CommunityPeople({
  community,
  canSeeInside,
  version,
  onShowAll,
}: {
  community: Community;
  canSeeInside: boolean;
  version: number;
  onShowAll: () => void;
}) {
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!canSeeInside) return;
    setFailed(false);
    const r = await listCommunityMembers(community.id, PAGE);
    if (r.ok) setMembers(r.data.members);
    else setFailed(true);
  }, [community.id, canSeeInside]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (!canSeeInside) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className={overlineClass}>People</h2>
        <p className="text-sm text-muted-foreground">{formatCount(community.members_count, "member", "members")}</p>
      </div>
    );
  }
  if (failed && !members) return <ErrorState compact title="Couldn't load members" onRetry={load} />;
  if (!members) {
    return (
      <div role="status" aria-label="Loading members" className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <div className="flex">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="-me-2 size-10 rounded-full border-2 border-background" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PeopleStrip
      people={members}
      total={community.members_count}
      moderators={members.filter((m) => m.is_owner || m.is_moderator)}
      onShowAll={onShowAll}
    />
  );
}
