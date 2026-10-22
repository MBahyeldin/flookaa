import { useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgeBadge } from "@/components/age-badge";
import { CommunityRulesDialog } from "@/components/community-rules-dialog";
import { followCommunity, joinCommunity, leaveCommunity, unfollowCommunity } from "@/services/communities";
import { formatCount } from "@/lib/format";
import { formatDateOnly } from "@/utils/formateDate";
import type { Community } from "@/types/community";
import { Tile } from "./Tile";

export type CommunityPatch = Partial<Pick<Community, "membership_status" | "following" | "members_count">>;

const errorText: Record<string, string> = {
  cannot_follow_private: "Private communities can't be followed.",
  recently_rejected: "This community declined your request recently.",
};

export function CommunityTile({
  community,
  onChange,
  linked = true,
}: {
  community: Community;
  onChange?: (patch: CommunityPatch) => void;
  /** Off where the tile mustn't navigate away (onboarding). */
  linked?: boolean;
}) {
  const [c, setC] = useState(community);
  const [busy, setBusy] = useState<"join" | "follow" | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => setC(community), [community]);

  const isPrivate = c.visibility === "private";
  const status = c.membership_status;

  const apply = (patch: CommunityPatch) => {
    setC((prev) => ({ ...prev, ...patch }));
    onChange?.(patch);
  };

  const run = async <T,>(
    kind: "join" | "follow",
    action: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>,
    onDone: (data: T) => void,
    failure: string,
  ) => {
    setBusy(kind);
    const r = await action();
    setBusy(null);
    if (r.ok) onDone(r.data);
    else toast.error(errorText[r.error] ?? failure);
  };

  const join = () =>
    run(
      "join",
      () => joinCommunity(c.id),
      ({ status }) =>
        apply({ membership_status: status, members_count: c.members_count + (status === "active" ? 1 : 0) }),
      "Couldn't join. Please try again.",
    );

  const leave = () => {
    if (status === "active" && !confirm(`Leave ${c.name}?`)) return;
    run(
      "join",
      () => leaveCommunity(c.id),
      () =>
        apply({
          membership_status: "none",
          members_count: Math.max(0, c.members_count - (status === "active" ? 1 : 0)),
        }),
      status === "active" ? "Couldn't leave. Please try again." : "Couldn't cancel the request. Please try again.",
    );
  };

  const follow = () =>
    run(
      "follow",
      () => (c.following ? unfollowCommunity(c.id) : followCommunity(c.id)),
      ({ following }) => apply({ following }),
      c.following ? "Couldn't unfollow. Please try again." : "Couldn't follow. Please try again.",
    );

  return (
    <>
      <Tile
        theme={c.theme}
        name={c.name}
        logo={c.thumbnail}
        href={linked ? `/communities/${c.slug}` : undefined}
        meta={
          <>
            <span>
              {isPrivate ? "Private" : "Public"} · {formatCount(c.members_count, "member", "members")}
            </span>
            <AgeBadge minAge={c.min_age} />
          </>
        }
        description={c.description}
        interests={c.interests}
        facts={formatCount(c.channels_count, "channel", "channels")}
      >
        {status === "active" ? (
          <Button variant="secondary" size="sm" className="flex-1" loading={busy === "join"} disabled={!!busy} onClick={leave}>
            <Check />
            Joined
          </Button>
        ) : status === "pending" ? (
          <Button variant="outline" size="sm" className="flex-1" loading={busy === "join"} disabled={!!busy} onClick={leave}>
            <Clock />
            Requested
          </Button>
        ) : status === "rejected" && c.rejected_until ? (
          <p className="flex-1 self-center text-xs text-muted-foreground">
            Ask again on {formatDateOnly(c.rejected_until)}
          </p>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            loading={busy === "join"}
            disabled={!!busy}
            onClick={() => (c.rules ? setRulesOpen(true) : join())}
          >
            {isPrivate ? "Request to join" : "Join"}
          </Button>
        )}
        {!isPrivate && (
          <Button variant="outline" size="sm" loading={busy === "follow"} disabled={!!busy} onClick={follow}>
            {c.following ? "Following" : "Follow"}
          </Button>
        )}
      </Tile>
      {rulesOpen && (
        <CommunityRulesDialog community={c} open onOpenChange={setRulesOpen} onAgree={join} />
      )}
    </>
  );
}
