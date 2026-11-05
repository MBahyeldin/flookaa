import { useCallback, useEffect, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { MemberRow } from "@/components/manage/MemberRow";
import { MembersSheetFrame } from "@/components/manage/MembersSheetFrame";
import { PersonRow, displayName } from "@/components/persona-link/PersonRow";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { listJoinRequests, listMembers, removeMember, resolveJoinRequest } from "@/services/channels";
import type { PaletteId } from "@/themes/palettes";
import type { ChannelMember, JoinRequest } from "@/types/channel";
import { formatDateOnly } from "@/lib/format";
import { useTranslation } from "react-i18next";

export type ChannelMembersTab = "members" | "requests";

/** version changes when the page hears membership changed. */
export function ChannelMembersSheet({
  channelId,
  theme,
  isPrivate,
  tab,
  onTabChange,
  onClose,
  version,
}: {
  channelId: string;
  theme: PaletteId;
  isPrivate: boolean;
  tab: ChannelMembersTab | null;
  onTabChange: (tab: ChannelMembersTab) => void;
  onClose: () => void;
  version: number;
}) {
  const { t } = useTranslation(["channels", "common"]);
  const open = tab !== null;
  const [members, setMembers] = useState<ChannelMember[] | null>(null);
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [membersFailed, setMembersFailed] = useState(false);
  const [requestsFailed, setRequestsFailed] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const loadMembers = useCallback(async () => {
    setMembersFailed(false);
    try {
      setMembers(await listMembers(channelId));
    } catch {
      setMembersFailed(true);
    }
  }, [channelId]);

  const loadRequests = useCallback(async () => {
    setRequestsFailed(false);
    try {
      setRequests(await listJoinRequests(channelId));
    } catch {
      setRequestsFailed(true);
    }
  }, [channelId]);

  useEffect(() => {
    if (open) loadMembers();
  }, [open, loadMembers, version]);

  useEffect(() => {
    if (open) loadRequests();
  }, [open, loadRequests, version]);

  const resolve = async (request: JoinRequest, decision: "approve" | "reject") => {
    setBusyId(request.persona_id);
    try {
      await resolveJoinRequest(channelId, request.persona_id, decision);
    } catch {
      toast.error(t("common:requests.updateFailed"));
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(
      decision === "approve"
        ? t("members.approved", { name: displayName(request) })
        : t("common:requests.rejected", { name: displayName(request) }),
    );
    setRequests((prev) => prev?.filter((r) => r.persona_id !== request.persona_id) ?? null);
    if (decision === "approve") loadMembers();
  };

  const remove = async (member: ChannelMember) => {
    const ok = await confirm({
      title: t("common:actions.removeConfirm", { name: displayName(member) }),
      body: t("members.removeBody"),
      confirmLabel: t("common:actions.remove"),
      destructive: true,
    });
    if (!ok) return;
    setBusyId(member.persona_id);
    try {
      await removeMember(channelId, member.persona_id);
    } catch {
      toast.error(t("common:members.removeFailed"));
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(t("common:members.removed", { name: displayName(member) }));
    setMembers((prev) => prev?.filter((m) => m.persona_id !== member.persona_id) ?? null);
  };

  const membersContent = membersFailed && !members ? (
    <ErrorState compact title={t("common:members.loadFailed")} onRetry={loadMembers} />
  ) : !members ? (
    <SkeletonList count={3} />
  ) : members.length <= 1 ? (
    <EmptyState compact icon={Users} title={t("common:members.onlyYou")} body={t("common:members.onlyYouBody")} />
  ) : (
    <ul className="divide-y divide-border">
      {members.map((m) => (
        <MemberRow
          key={m.persona_id}
          person={m}
          detail={t("common:members.joined", { date: formatDateOnly(m.joined_at) })}
          role={m.is_owner ? "Owner" : m.is_moderator ? "Moderator" : undefined}
          busy={busyId === m.persona_id}
          actions={m.is_owner ? [] : [{ label: t("members.removeAction"), destructive: true, run: () => remove(m) }]}
        />
      ))}
    </ul>
  );

  const requestsContent = requestsFailed && !requests ? (
    <ErrorState compact title={t("common:requests.loadFailed")} onRetry={loadRequests} />
  ) : !requests ? (
    <SkeletonList count={3} />
  ) : requests.length === 0 ? (
    <EmptyState compact icon={UserPlus} title={t("common:requests.none")} />
  ) : (
    <ul className="divide-y divide-border">
      {requests.map((r) => (
        <PersonRow key={r.persona_id} person={r} detail={t("common:requests.askedOn", { date: formatDateOnly(r.requested_at) })}>
          <Button size="sm" disabled={busyId === r.persona_id} onClick={() => resolve(r, "approve")}>
            {t("common:actions.approve")}
          </Button>
          <Button size="sm" variant="ghost" disabled={busyId === r.persona_id} onClick={() => resolve(r, "reject")}>
            {t("common:actions.reject")}
          </Button>
        </PersonRow>
      ))}
    </ul>
  );

  const count = members?.length;
  return (
    <>
      <MembersSheetFrame
        open={open}
        onClose={onClose}
        theme={theme}
        title={t("common:members.title")}
        description={count === undefined ? t("members.description") : t("common:counts.members", { count, n: count })}
        tab={tab ?? "members"}
        onTabChange={onTabChange}
        tabs={[
          { id: "members", label: t("common:members.title"), content: membersContent },
          ...(isPrivate || requests?.length
            ? [{ id: "requests" as const, label: t("common:requests.title"), count: requests?.length, content: requestsContent }]
            : []),
        ]}
      />
      {confirmDialog}
    </>
  );
}
