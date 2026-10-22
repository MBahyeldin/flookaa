import { useCallback, useEffect, useState } from "react";
import { Hash, MoreHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDateOnly } from "@/utils/formateDate";

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

  const loadMembers = useCallback(async () => {
    setError(null);
    const r = await listCommunityMembers(community.id);
    if (r.ok) setMembers(r.data.members);
    else setError(r.error === "members_only" ? "Only members can see who's in this community." : "Check your connection and try again.");
  }, [community.id]);

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
      toast.error("Couldn't update the request. Please try again.");
      return;
    }
    toast.success(
      decision === "approve" ? `${displayName(request)} joined the community` : `Request from ${displayName(request)} declined`,
    );
    setRequests((prev) => prev?.filter((p) => p.persona_id !== request.persona_id) ?? null);
    if (decision === "approve") loadMembers();
  };

  const handleChannelResolve = async (request: CommunityChannelRequest, decision: "approve" | "reject") => {
    setBusyChannelId(request.channel_id);
    const r = await resolveChannelRequest(community.id, request.channel_id, decision);
    setBusyChannelId(null);
    if (!r.ok) {
      toast.error("Couldn't update the request. Please try again.");
      return;
    }
    toast.success(decision === "approve" ? `${request.name} was added` : `${request.name} was declined`);
    setChannelRequests((prev) => prev?.filter((p) => p.channel_id !== request.channel_id) ?? null);
    if (decision === "approve") onChannelAdded();
  };

  const handleRemove = async (member: CommunityMember) => {
    if (!confirm(`Remove ${displayName(member)} from this community?`)) return;
    setBusyId(member.persona_id);
    const r = await removeCommunityMember(community.id, member.persona_id);
    setBusyId(null);
    if (!r.ok) {
      toast.error("Couldn't remove this member. Please try again.");
      return;
    }
    toast.success(`${displayName(member)} was removed`);
    setMembers((prev) => prev?.filter((m) => m.persona_id !== member.persona_id) ?? null);
  };

  const handleModerator = async (member: CommunityMember, appoint: boolean) => {
    const self = member.persona_id === me;
    if (!appoint && self && !confirm("Step down as a moderator of this community?")) return;
    setBusyId(member.persona_id);
    const r = appoint
      ? await appointCommunityModerator(community.id, member.persona_id)
      : await removeCommunityModerator(community.id, member.persona_id);
    setBusyId(null);
    if (!r.ok) {
      toast.error("Couldn't change the moderator role. Please try again.");
      return;
    }
    toast.success(
      appoint
        ? `${displayName(member)} is now a moderator`
        : self
          ? "You stepped down as a moderator"
          : `${displayName(member)} is no longer a moderator`,
    );
    setMembers((prev) => prev?.map((m) => (m.persona_id === member.persona_id ? { ...m, is_moderator: appoint } : m)) ?? null);
  };

  const memberActions = (member: CommunityMember) => {
    if (member.is_owner) return [];
    const self = member.persona_id === me;
    const actions: { label: string; destructive?: boolean; run: () => void }[] = [];
    if (owner && !member.is_moderator) actions.push({ label: "Make moderator", run: () => handleModerator(member, true) });
    if (member.is_moderator && (owner || self)) {
      actions.push({ label: self ? "Step down as moderator" : "Remove moderator", run: () => handleModerator(member, false) });
    }
    if (manager && !self && (owner || !member.is_moderator)) {
      actions.push({ label: "Remove from community", destructive: true, run: () => handleRemove(member) });
    }
    return actions;
  };

  const membersList =
    error ? (
      <ErrorState compact title="Couldn't load members" body={error} onRetry={loadMembers} />
    ) : members === null ? (
      <SkeletonList count={3} />
    ) : (
      <ul className="divide-y divide-border">
        {members.map((member) => {
          const actions = memberActions(member);
          return (
            <PersonRow
              key={member.persona_id}
              person={member}
              detail={`Joined ${formatDateOnly(member.joined_at)}`}
              badge={member.is_owner ? "Owner" : member.is_moderator ? "Moderator" : undefined}
            >
              {actions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Actions for ${displayName(member)}`}
                      disabled={busyId === member.persona_id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.map((a) => (
                      <DropdownMenuItem key={a.label} variant={a.destructive ? "destructive" : "default"} onSelect={a.run}>
                        {a.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </PersonRow>
          );
        })}
      </ul>
    );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Members</SheetTitle>
          <SheetDescription>
            {community.members_count === 1 ? "1 member" : `${community.members_count} members`}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {manager ? (
            <Tabs value={tab ?? "members"} onValueChange={(v) => onTabChange(v as MembersTab)}>
              <TabsList className="w-full">
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="requests">Requests{requests?.length ? ` (${requests.length})` : ""}</TabsTrigger>
                <TabsTrigger value="channels">
                  Channels{channelRequests?.length ? ` (${channelRequests.length})` : ""}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="members" className="mt-2">
                {membersList}
              </TabsContent>
              <TabsContent value="requests" className="mt-2">
                {requests === null && requestsFailed ? (
                  <ErrorState compact title="Couldn't load requests" onRetry={loadRequests} />
                ) : requests === null ? (
                  <SkeletonList count={3} />
                ) : requests.length === 0 ? (
                  <EmptyState compact icon={UserPlus} title="No pending requests" />
                ) : (
                  <ul className="divide-y divide-border">
                    {requests.map((request) => (
                      <PersonRow
                        key={request.persona_id}
                        person={request}
                        detail={`Asked on ${formatDateOnly(request.requested_at)}`}
                      >
                        <Button
                          size="sm"
                          disabled={busyId === request.persona_id}
                          onClick={() => handleResolve(request, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === request.persona_id}
                          onClick={() => handleResolve(request, "reject")}
                        >
                          Decline
                        </Button>
                      </PersonRow>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="channels" className="mt-2">
                {channelRequests === null && channelRequestsFailed ? (
                  <ErrorState compact title="Couldn't load channel requests" onRetry={loadChannelRequests} />
                ) : channelRequests === null ? (
                  <SkeletonList count={3} />
                ) : channelRequests.length === 0 ? (
                  <EmptyState compact icon={Hash} title="No channels waiting to join" />
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
                )}
              </TabsContent>
            </Tabs>
          ) : (
            membersList
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
