import { useCallback, useEffect, useState } from "react";
import { Hash, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useConfirm } from "@/components/confirm-dialog";
import { MemberRow, type MemberAction } from "@/components/manage/MemberRow";
import { MembersSheetFrame, type MembersSheetTab } from "@/components/manage/MembersSheetFrame";
import { PersonRow, displayName } from "@/components/persona-link/PersonRow";
import ChannelRequestRow from "./ChannelRequestRow";
import {
  appointCommunityModerator,
  listChannelRequests,
  listCommunityMembers,
  listCommunityRequests,
  removeCommunityMember,
  removeCommunityModerator,
  resolveChannelRequest,
  resolveCommunityRequest,
} from "@/services/communities";
import type { Community, CommunityChannelRequest, CommunityJoinRequest, CommunityMember } from "@/types/community";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { formatDateOnly } from "@/lib/format";
import { useTranslation } from "react-i18next";

export type MembersTab = "members" | "requests" | "channels";

/** membersKey / requestsKey / channelRequestsKey change when the page hears the lists changed. */
export default function MembersSheet({
  community,
  tab,
  onTabChange,
  onClose,
  membersKey,
  requestsKey,
  channelRequestsKey,
  onChannelAdded,
}: {
  community: Community;
  tab: MembersTab | null;
  onTabChange: (tab: MembersTab) => void;
  onClose: () => void;
  membersKey: number;
  requestsKey: number;
  channelRequestsKey: number;
  onChannelAdded: () => void;
}) {
  const { t } = useTranslation(["communities", "common"]);
  const open = tab !== null;
  const manager = !!community.can_manage;
  const owner = !!community.can_own;
  const me = Number(useUserProfileStore((s) => s.persona?.id));
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [requests, setRequests] = useState<CommunityJoinRequest[] | null>(null);
  const [channelRequests, setChannelRequests] = useState<CommunityChannelRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestsFailed, setRequestsFailed] = useState(false);
  const [channelRequestsFailed, setChannelRequestsFailed] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyChannelId, setBusyChannelId] = useState<number | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const loadMembers = useCallback(async () => {
    setError(null);
    const r = await listCommunityMembers(community.id);
    if (r.ok) setMembers(r.data.members);
    else setError(r.error === "members_only" ? t("members.membersOnly") : t("common:states.checkConnection"));
  }, [community.id, t]);

  const loadRequests = useCallback(async () => {
    if (!manager) return;
    setRequestsFailed(false);
    const r = await listCommunityRequests(community.id);
    if (r.ok) setRequests(r.data.requests);
    else setRequestsFailed(true);
  }, [community.id, manager]);

  useEffect(() => {
    if (open) loadMembers();
  }, [open, loadMembers, membersKey]);

  useEffect(() => {
    if (open) loadRequests();
  }, [open, loadRequests, requestsKey]);

  const loadChannelRequests = useCallback(async () => {
    if (!manager) return;
    setChannelRequestsFailed(false);
    const r = await listChannelRequests(community.id);
    if (r.ok) setChannelRequests(r.data.requests);
    else setChannelRequestsFailed(true);
  }, [community.id, manager]);

  useEffect(() => {
    if (open) loadChannelRequests();
  }, [open, loadChannelRequests, channelRequestsKey]);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const handleResolve = async (request: CommunityJoinRequest, decision: "approve" | "reject") => {
    setBusyId(request.persona_id);
    const r = await resolveCommunityRequest(community.id, request.persona_id, decision);
    setBusyId(null);
    if (!r.ok) {
      toast.error(t("common:requests.updateFailed"));
      return;
    }
    toast.success(
      decision === "approve"
        ? t("members.approved", { name: displayName(request) })
        : t("common:requests.rejected", { name: displayName(request) }),
    );
    setRequests((prev) => prev?.filter((p) => p.persona_id !== request.persona_id) ?? null);
    if (decision === "approve") loadMembers();
  };

  const handleChannelResolve = async (request: CommunityChannelRequest, decision: "approve" | "reject") => {
    setBusyChannelId(request.channel_id);
    const r = await resolveChannelRequest(community.id, request.channel_id, decision);
    setBusyChannelId(null);
    if (!r.ok) {
      toast.error(t("common:requests.updateFailed"));
      return;
    }
    toast.success(
      decision === "approve" ? t("members.channelAdded", { name: request.name }) : t("members.channelRejected", { name: request.name }),
    );
    setChannelRequests((prev) => prev?.filter((p) => p.channel_id !== request.channel_id) ?? null);
    if (decision === "approve") onChannelAdded();
  };

  const handleRemove = async (member: CommunityMember) => {
    const ok = await confirm({
      title: t("common:actions.removeConfirm", { name: displayName(member) }),
      body: t("members.removeBody"),
      confirmLabel: t("common:actions.remove"),
      destructive: true,
    });
    if (!ok) return;
    setBusyId(member.persona_id);
    const r = await removeCommunityMember(community.id, member.persona_id);
    setBusyId(null);
    if (!r.ok) {
      toast.error(t("common:members.removeFailed"));
      return;
    }
    toast.success(t("common:members.removed", { name: displayName(member) }));
    setMembers((prev) => prev?.filter((m) => m.persona_id !== member.persona_id) ?? null);
  };

  const handleModerator = async (member: CommunityMember, appoint: boolean) => {
    const self = member.persona_id === me;
    if (!appoint) {
      const ok = await confirm(
        self
          ? { title: t("moderators.stepDownConfirm"), body: t("moderators.stepDownBody"), confirmLabel: t("moderators.stepDown") }
          : {
              title: t("moderators.removeConfirm", { name: displayName(member) }),
              body: t("moderators.removeBody"),
              confirmLabel: t("moderators.remove"),
            },
      );
      if (!ok) return;
    }
    setBusyId(member.persona_id);
    const r = appoint
      ? await appointCommunityModerator(community.id, member.persona_id)
      : await removeCommunityModerator(community.id, member.persona_id);
    setBusyId(null);
    if (!r.ok) {
      toast.error(t("moderators.failed"));
      return;
    }
    toast.success(
      appoint
        ? t("moderators.appointed", { name: displayName(member) })
        : self
          ? t("moderators.steppedDown")
          : t("moderators.removed", { name: displayName(member) }),
    );
    setMembers((prev) => prev?.map((m) => (m.persona_id === member.persona_id ? { ...m, is_moderator: appoint } : m)) ?? null);
  };

  const memberActions = (member: CommunityMember): MemberAction[] => {
    if (member.is_owner) return [];
    const self = member.persona_id === me;
    const actions: MemberAction[] = [];
    if (owner && !member.is_moderator) actions.push({ label: t("moderators.make"), run: () => handleModerator(member, true) });
    if (member.is_moderator && (owner || self)) {
      actions.push({ label: self ? t("moderators.stepDownAction") : t("moderators.remove"), run: () => handleModerator(member, false) });
    }
    if (manager && !self && (owner || !member.is_moderator)) {
      actions.push({ label: t("channelsList.removeAction"), destructive: true, run: () => handleRemove(member) });
    }
    return actions;
  };

  const membersList = error ? (
    <ErrorState compact title={t("common:members.loadFailed")} body={error} onRetry={loadMembers} />
  ) : members === null ? (
    <SkeletonList count={3} />
  ) : members.length <= 1 && manager ? (
    <EmptyState compact icon={Users} title={t("common:members.onlyYou")} body={t("common:members.onlyYouBody")} />
  ) : (
    <ul className="divide-y divide-border">
      {members.map((member) => (
        <MemberRow
          key={member.persona_id}
          person={member}
          detail={t("common:members.joined", { date: formatDateOnly(member.joined_at) })}
          role={member.is_owner ? "Owner" : member.is_moderator ? "Moderator" : undefined}
          busy={busyId === member.persona_id}
          actions={memberActions(member)}
        />
      ))}
    </ul>
  );

  const requestsList =
    requests === null && requestsFailed ? (
      <ErrorState compact title={t("common:requests.loadFailed")} onRetry={loadRequests} />
    ) : requests === null ? (
      <SkeletonList count={3} />
    ) : requests.length === 0 ? (
      <EmptyState compact icon={UserPlus} title={t("common:requests.none")} />
    ) : (
      <ul className="divide-y divide-border">
        {requests.map((request) => (
          <PersonRow key={request.persona_id} person={request} detail={t("common:requests.askedOn", { date: formatDateOnly(request.requested_at) })}>
            <Button size="sm" disabled={busyId === request.persona_id} onClick={() => handleResolve(request, "approve")}>
              {t("common:actions.approve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busyId === request.persona_id}
              onClick={() => handleResolve(request, "reject")}
            >
              {t("common:actions.reject")}
            </Button>
          </PersonRow>
        ))}
      </ul>
    );

  const channelRequestsList =
    channelRequests === null && channelRequestsFailed ? (
      <ErrorState compact title={t("members.channelRequestsFailed")} onRetry={loadChannelRequests} />
    ) : channelRequests === null ? (
      <SkeletonList count={3} />
    ) : channelRequests.length === 0 ? (
      <EmptyState compact icon={Hash} title={t("members.noChannelRequests")} />
    ) : (
      <ul className="divide-y divide-border">
        {channelRequests.map((request) => (
          <ChannelRequestRow
            key={request.channel_id}
            request={request}
            busy={busyChannelId === request.channel_id}
            onResolve={(decision) => handleChannelResolve(request, decision)}
          />
        ))}
      </ul>
    );

  const tabs: MembersSheetTab<MembersTab>[] = [{ id: "members", label: t("common:members.title"), content: membersList }];
  if (manager) {
    tabs.push(
      { id: "requests", label: t("common:requests.title"), count: requests?.length, content: requestsList },
      { id: "channels", label: t("members.channelRequests"), short: t("common:nav.channels"), count: channelRequests?.length, content: channelRequestsList },
    );
  }

  return (
    <>
      <MembersSheetFrame
        open={open}
        onClose={onClose}
        theme={community.theme}
        title={t("common:members.title")}
        description={t("common:counts.members", { count: community.members_count, n: community.members_count })}
        tab={tab ?? "members"}
        onTabChange={onTabChange}
        tabs={tabs}
      />
      {confirmDialog}
    </>
  );
}
