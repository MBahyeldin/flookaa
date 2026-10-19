import { useCallback, useEffect, useState } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonRow, displayName } from "@/components/persona-link/PersonRow";
import {
  appointCommunityModerator,
  listCommunityMembers,
  listCommunityRequests,
  removeCommunityMember,
  removeCommunityModerator,
  resolveCommunityRequest,
} from "@/services/communities";
import type { Community, CommunityJoinRequest, CommunityMember } from "@/types/community";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { formatDateOnly } from "@/utils/formateDate";

export type MembersTab = "members" | "requests";

/** membersKey / requestsKey change when the page hears the lists changed. */
export default function MembersSheet({
  community,
  tab,
  onTabChange,
  onClose,
  membersKey,
  requestsKey,
}: {
  community: Community;
  tab: MembersTab | null;
  onTabChange: (tab: MembersTab) => void;
  onClose: () => void;
  membersKey: number;
  requestsKey: number;
}) {
  const open = tab !== null;
  const manager = !!community.can_manage;
  const owner = !!community.can_own;
  const me = Number(useUserProfileStore((s) => s.persona?.id));
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [requests, setRequests] = useState<CommunityJoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadMembers = useCallback(async () => {
    const r = await listCommunityMembers(community.id);
    if (r.ok) setMembers(r.data.members);
    else setError(r.error === "members_only" ? "Only members can see who's in this community." : "Couldn't load members.");
  }, [community.id]);

  const loadRequests = useCallback(async () => {
    if (!manager) return;
    const r = await listCommunityRequests(community.id);
    if (r.ok) setRequests(r.data.requests);
  }, [community.id, manager]);

  useEffect(() => {
    if (open) loadMembers();
  }, [open, loadMembers, membersKey]);

  useEffect(() => {
    if (open) loadRequests();
  }, [open, loadRequests, requestsKey]);

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
      <p role="alert" className="py-6 text-center text-sm text-muted-foreground">
        {error}
      </p>
    ) : members === null ? (
      <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
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
              </TabsList>
              <TabsContent value="members" className="mt-2">
                {membersList}
              </TabsContent>
              <TabsContent value="requests" className="mt-2">
                {requests === null ? (
                  <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : requests.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No pending requests.</p>
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
            </Tabs>
          ) : (
            membersList
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
