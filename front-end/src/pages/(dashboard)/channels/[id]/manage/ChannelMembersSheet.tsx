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
import { formatDateOnly } from "@/utils/formateDate";

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
      toast.error("Couldn't update the request. Try again.");
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(decision === "approve" ? `${displayName(request)} joined the channel` : `Request from ${displayName(request)} rejected`);
    setRequests((prev) => prev?.filter((r) => r.persona_id !== request.persona_id) ?? null);
    if (decision === "approve") loadMembers();
  };

  const remove = async (member: ChannelMember) => {
    const ok = await confirm({
      title: `Remove ${displayName(member)}?`,
      body: "They leave the channel and lose any moderator role. They can ask to join again.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(member.persona_id);
    try {
      await removeMember(channelId, member.persona_id);
    } catch {
      toast.error("Couldn't remove this member. Try again.");
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(`${displayName(member)} was removed`);
    setMembers((prev) => prev?.filter((m) => m.persona_id !== member.persona_id) ?? null);
  };

  const membersContent = membersFailed && !members ? (
    <ErrorState compact title="Couldn't load members" onRetry={loadMembers} />
  ) : !members ? (
    <SkeletonList count={3} />
  ) : members.length <= 1 ? (
    <EmptyState compact icon={Users} title="Only you so far" body="Members show here once people join." />
  ) : (
    <ul className="divide-y divide-border">
      {members.map((m) => (
        <MemberRow
          key={m.persona_id}
          person={m}
          detail={`Joined ${formatDateOnly(m.joined_at)}`}
          role={m.is_owner ? "Owner" : m.is_moderator ? "Moderator" : undefined}
          busy={busyId === m.persona_id}
          actions={m.is_owner ? [] : [{ label: "Remove from channel", destructive: true, run: () => remove(m) }]}
        />
      ))}
    </ul>
  );

  const requestsContent = requestsFailed && !requests ? (
    <ErrorState compact title="Couldn't load requests" onRetry={loadRequests} />
  ) : !requests ? (
    <SkeletonList count={3} />
  ) : requests.length === 0 ? (
    <EmptyState compact icon={UserPlus} title="No pending requests" />
  ) : (
    <ul className="divide-y divide-border">
      {requests.map((r) => (
        <PersonRow key={r.persona_id} person={r} detail={`Asked on ${formatDateOnly(r.requested_at)}`}>
          <Button size="sm" disabled={busyId === r.persona_id} onClick={() => resolve(r, "approve")}>
            Approve
          </Button>
          <Button size="sm" variant="ghost" disabled={busyId === r.persona_id} onClick={() => resolve(r, "reject")}>
            Reject
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
        title="Members"
        description={count === undefined ? "Channel members" : count === 1 ? "1 member" : `${count} members`}
        tab={tab ?? "members"}
        onTabChange={onTabChange}
        tabs={[
          { id: "members", label: "Members", content: membersContent },
          ...(isPrivate || requests?.length
            ? [{ id: "requests" as const, label: "Requests", count: requests?.length, content: requestsContent }]
            : []),
        ]}
      />
      {confirmDialog}
    </>
  );
}
