import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PersonRow, displayName } from "@/components/persona-link/PersonRow";
import {
  listCommunityMembers,
  listCommunityRequests,
  removeCommunityMember,
  resolveCommunityRequest,
} from "@/services/communities";
import type { Community, CommunityJoinRequest, CommunityMember } from "@/types/community";
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
        {members.map((member) => (
          <PersonRow
            key={member.persona_id}
            person={member}
            detail={`Joined ${formatDateOnly(member.joined_at)}`}
            badge={member.is_owner ? "Owner" : undefined}
          >
            {manager && !member.is_owner && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={busyId === member.persona_id}
                onClick={() => handleRemove(member)}
              >
                Remove
              </Button>
            )}
          </PersonRow>
        ))}
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
