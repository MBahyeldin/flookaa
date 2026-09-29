import { useCallback, useEffect, useState } from "react";
import { Loader2, User2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listJoinRequests,
  listMembers,
  removeMember,
  resolveJoinRequest,
} from "@/services/channels";
import type { ChannelMember, JoinRequest } from "@/types/channel";
import { formatDateOnly } from "@/utils/formateDate";

type Person = Pick<JoinRequest, "first_name" | "last_name" | "name" | "thumbnail">;

const displayName = (p: Person) =>
  `${p.first_name} ${p.last_name}`.trim() || p.name;

/**
 * Join requests and members for owners, channel moderators and admins. Both
 * lists are fetched each time the sheet opens rather than kept live: nothing
 * pushes join requests over the websocket yet.
 */
export default function ModerationSheet({
  channelId,
  open,
  onOpenChange,
}: {
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The persona whose row has a request in flight, so its buttons disable.
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextRequests, nextMembers] = await Promise.all([
        listJoinRequests(channelId),
        listMembers(channelId),
      ]);
      setRequests(nextRequests);
      setMembers(nextMembers);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleResolve = async (request: JoinRequest, decision: "approve" | "reject") => {
    setBusyId(request.persona_id);
    try {
      await resolveJoinRequest(channelId, request.persona_id, decision);
    } catch (err) {
      toast.error((err as Error).message);
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(
      decision === "approve"
        ? `${displayName(request)} joined the channel`
        : `Request from ${displayName(request)} rejected`
    );
    // An approval adds a member, so reload both lists.
    load();
  };

  const handleRemove = async (member: ChannelMember) => {
    if (!confirm(`Remove ${displayName(member)} from this channel?`)) return;
    setBusyId(member.persona_id);
    try {
      await removeMember(channelId, member.persona_id);
    } catch (err) {
      toast.error((err as Error).message);
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(`${displayName(member)} was removed`);
    setMembers((prev) => prev.filter((m) => m.persona_id !== member.persona_id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage channel</SheetTitle>
          <SheetDescription>
            Approve people who asked to join, and remove members.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {loading && !requests.length && !members.length ? (
            <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : loadError ? (
            <div role="alert" className="space-y-3 py-6 text-sm">
              <p className="text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={load}>
                Try again
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="requests">
              <TabsList className="w-full">
                <TabsTrigger value="requests">
                  Requests{requests.length ? ` (${requests.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="mt-2">
                {requests.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No pending requests.
                  </p>
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
                          Reject
                        </Button>
                      </PersonRow>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="members" className="mt-2">
                <ul className="divide-y divide-border">
                  {members.map((member) => (
                    <PersonRow
                      key={member.persona_id}
                      person={member}
                      detail={`Joined ${formatDateOnly(member.joined_at)}`}
                      badge={member.is_owner ? "Owner" : member.is_moderator ? "Moderator" : undefined}
                    >
                      {/* The owner can't be removed; the server refuses it too. */}
                      {!member.is_owner && (
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
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PersonRow({
  person,
  detail,
  badge,
  children,
}: {
  person: Person;
  detail: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={person.thumbnail || ""} />
        <AvatarFallback>
          <User2 className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{displayName(person)}</span>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}
