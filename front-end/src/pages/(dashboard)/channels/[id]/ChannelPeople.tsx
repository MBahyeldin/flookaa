import { useCallback, useEffect, useState } from "react";
import { SkeletonList } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { PeopleStrip } from "@/components/people-strip";
import { PersonRow } from "@/components/persona-link/PersonRow";
import { listMembers } from "@/services/channels";
import type { ChannelMember } from "@/types/channel";
import { formatMonthYear } from "@/lib/format";
import { useTranslation } from "react-i18next";

// `version` changes on membership events, so the list follows joins and leaves.
export function ChannelPeople({
  channelId,
  version,
  onShowAll,
}: {
  channelId: string;
  version: number;
  onShowAll?: () => void;
}) {
  const { t } = useTranslation("common");
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

  if (failed && !members) return <ErrorState compact title={t("members.loadFailed")} onRetry={load} />;
  if (!members) return <SkeletonList count={4} />;

  return (
    <section className="flex flex-col gap-6">
      <PeopleStrip people={members} total={members.length} moderators={members.filter((m) => m.is_owner || m.is_moderator)}
        onShowAll={onShowAll}
      />
      <ul className="divide-y">
        {members.map((m) => (
          <PersonRow
            key={m.persona_id}
            person={m}
            detail={t("members.joined", { date: formatMonthYear(m.joined_at, "short") })}
            badge={m.is_owner ? t("roles.owner") : m.is_moderator ? t("roles.moderator") : undefined}
          />
        ))}
      </ul>
    </section>
  );
}
