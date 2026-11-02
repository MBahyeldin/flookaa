import { useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgeBadge } from "@/components/age-badge";
import { joinChannel, leaveChannel, setFollowing } from "@/services/channels";
import { formatCompact } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { useTranslation } from "react-i18next";
import type { Channel } from "@/types/channel";
import { Tile } from "./Tile";

export type ChannelPatch = Partial<Pick<Channel, "is_member" | "is_pending" | "is_follower" | "members_count" | "followers_count">>;

export function ChannelTile({
  channel,
  onChange,
  linked = true,
}: {
  channel: Channel;
  onChange?: (patch: ChannelPatch) => void;
  /** Off where the tile mustn't navigate away (onboarding). */
  linked?: boolean;
}) {
  const { t } = useTranslation();
  const [c, setC] = useState(channel);
  const [busy, setBusy] = useState<"join" | "follow" | null>(null);
  useEffect(() => setC(channel), [channel]);

  const isPrivate = c.visibility === "private";
  const joined = c.is_member || c.is_owner;

  const apply = (patch: ChannelPatch) => {
    setC((prev) => ({ ...prev, ...patch }));
    onChange?.(patch);
  };

  const join = async () => {
    if (joined && !confirm(t("confirm.leave", { name: c.name }))) return;
    setBusy("join");
    if (joined || c.is_pending) {
      const error = await leaveChannel(c.id);
      setBusy(null);
      if (error) return toast.error(errorMessage(error.message));
      apply(
        joined
          ? { is_member: false, members_count: Math.max(0, c.members_count - 1) }
          : { is_pending: false },
      );
      return;
    }
    const r = await joinChannel(c.id);
    setBusy(null);
    if (r.error) return toast.error(errorMessage(r.error.message));
    apply(r.status === "active" ? { is_member: true, members_count: c.members_count + 1 } : { is_pending: true });
  };

  const follow = async () => {
    const next = !c.is_follower;
    setBusy("follow");
    const error = await setFollowing(c.id, next);
    setBusy(null);
    if (error) return toast.error(errorMessage(error.message));
    apply({ is_follower: next, followers_count: Math.max(0, c.followers_count + (next ? 1 : -1)) });
  };

  return (
    <Tile
      theme={c.theme}
      name={c.name}
      logo={c.thumbnail}
      href={linked ? `/channels/${c.id}` : undefined}
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
      interests={c.interests ?? []}
      facts={isPrivate ? t("membersOnly") : t("counts.followers", { count: c.followers_count, n: formatCompact(c.followers_count) })}
    >
      {joined ? (
        <Button variant="secondary" size="sm" className="flex-1" loading={busy === "join"} disabled={!!busy} onClick={join}>
          <Check />
          {t("actions.joined")}
        </Button>
      ) : c.is_pending ? (
        <Button variant="outline" size="sm" className="flex-1" loading={busy === "join"} disabled={!!busy} onClick={join}>
          <Clock />
          {t("actions.requested")}
        </Button>
      ) : (
        <Button size="sm" className="flex-1" loading={busy === "join"} disabled={!!busy} onClick={join}>
          {isPrivate ? t("actions.requestToJoin") : t("actions.join")}
        </Button>
      )}
      <Button variant="outline" size="sm" loading={busy === "follow"} disabled={!!busy} onClick={follow}>
        {c.is_follower ? t("actions.following") : t("actions.follow")}
      </Button>
    </Tile>
  );
}
