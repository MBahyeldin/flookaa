import { useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgeBadge } from "@/components/age-badge";
import { CommunityRulesDialog } from "@/components/community-rules-dialog";
import { followCommunity, joinCommunity, leaveCommunity, unfollowCommunity } from "@/services/communities";
import { formatCompact, formatDateOnly } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { Community } from "@/types/community";
import { Tile } from "./Tile";
import { useTranslation } from "react-i18next";

export type CommunityPatch = Partial<Pick<Community, "membership_status" | "following" | "members_count">>;

const KNOWN_ERRORS = ["cannot_follow_private", "recently_rejected"];

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
  const { t } = useTranslation(["common", "communities"]);
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
    else toast.error(KNOWN_ERRORS.includes(r.error) ? errorMessage(r.error) : failure);
  };

  const join = () =>
    run(
      "join",
      () => joinCommunity(c.id),
      ({ status }) =>
        apply({ membership_status: status, members_count: c.members_count + (status === "active" ? 1 : 0) }),
      t("communities:errors.joinFailed"),
    );

  const leave = () => {
    if (status === "active" && !confirm(t("confirm.leave", { name: c.name }))) return;
    run(
      "join",
      () => leaveCommunity(c.id),
      () =>
        apply({
          membership_status: "none",
          members_count: Math.max(0, c.members_count - (status === "active" ? 1 : 0)),
        }),
      status === "active" ? t("communities:errors.leaveFailed") : t("communities:errors.cancelFailed"),
    );
  };

  const follow = () =>
    run(
      "follow",
      () => (c.following ? unfollowCommunity(c.id) : followCommunity(c.id)),
      ({ following }) => apply({ following }),
      c.following ? t("communities:errors.unfollowFailed") : t("communities:errors.followFailed"),
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
              {isPrivate ? t("visibility.private") : t("visibility.public")} ·{" "}
              {t("counts.members", { count: c.members_count, n: formatCompact(c.members_count) })}
            </span>
            <AgeBadge minAge={c.min_age} />
          </>
        }
        description={c.description}
        interests={c.interests}
        facts={t("counts.channels", { count: c.channels_count, n: formatCompact(c.channels_count) })}
      >
        {status === "active" ? (
          <Button variant="secondary" size="sm" className="flex-1" loading={busy === "join"} disabled={!!busy} onClick={leave}>
            <Check />
            {t("actions.joined")}
          </Button>
        ) : status === "pending" ? (
          <Button variant="outline" size="sm" className="flex-1" loading={busy === "join"} disabled={!!busy} onClick={leave}>
            <Clock />
            {t("actions.requested")}
          </Button>
        ) : status === "rejected" && c.rejected_until ? (
          <p className="flex-1 self-center text-xs text-muted-foreground">
            {t("communities:askAgainOn", { date: formatDateOnly(c.rejected_until) })}
          </p>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            loading={busy === "join"}
            disabled={!!busy}
            onClick={() => (c.rules ? setRulesOpen(true) : join())}
          >
            {isPrivate ? t("actions.requestToJoin") : t("actions.join")}
          </Button>
        )}
        {!isPrivate && (
          <Button variant="outline" size="sm" loading={busy === "follow"} disabled={!!busy} onClick={follow}>
            {c.following ? t("actions.following") : t("actions.follow")}
          </Button>
        )}
      </Tile>
      {rulesOpen && (
        <CommunityRulesDialog community={c} open onOpenChange={setRulesOpen} onAgree={join} />
      )}
    </>
  );
}
