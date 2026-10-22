import { useCallback, useEffect, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  listFollowers,
  listFollowRequests,
  removeFollower,
  resolveFollowRequest,
} from "@/services/persona";
import type { ActiveFollower, Follower, FollowRequest } from "@/types/persona";
import { formatDateOnly } from "@/utils/formateDate";

export type FollowersTab = "requests" | "followers";

const displayName = (p: Follower) => `${p.first_name} ${p.last_name}`.trim();

/** Your own persona's follow requests and followers. */
export default function FollowersSheet({
  personaId,
  open,
  onOpenChange,
  tab,
  onTabChange,
  reloadKey,
}: {
  personaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: FollowersTab;
  onTabChange: (tab: FollowersTab) => void;
  /** Bumped on live follow frames; reloads the lists while open. */
  reloadKey: number;
}) {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [followers, setFollowers] = useState<ActiveFollower[]>([]);
  // True until the first load, so an empty list never flashes before it.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [nextRequests, nextFollowers] = await Promise.all([
        listFollowRequests(personaId),
        listFollowers(personaId),
      ]);
      setRequests(nextRequests);
      setFollowers(nextFollowers);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    if (open) load();
  }, [open, load, reloadKey]);

  const handleResolve = async (request: FollowRequest, decision: "approve" | "reject") => {
    setBusyId(request.persona_id);
    try {
      await resolveFollowRequest(personaId, request.persona_id, decision);
    } catch (err) {
      toast.error((err as Error).message);
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(
      decision === "approve"
        ? `${displayName(request)} now follows you`
        : `Request from ${displayName(request)} rejected`
    );
    load();
  };

  const handleRemove = async (follower: ActiveFollower) => {
    if (!confirm(`Remove ${displayName(follower)}? They won't be told.`)) return;
    setBusyId(follower.persona_id);
    try {
      await removeFollower(personaId, follower.persona_id);
    } catch (err) {
      toast.error((err as Error).message);
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(`${displayName(follower)} was removed`);
    setFollowers((prev) => prev.filter((f) => f.persona_id !== follower.persona_id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Followers</SheetTitle>
          <SheetDescription>Approve follow requests, and remove followers.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {loading && !requests.length && !followers.length ? (
            <SkeletonList count={3} />
          ) : loadError ? (
            <ErrorState compact title="Couldn't load followers" onRetry={load} />
          ) : (
            <Tabs value={tab} onValueChange={(v) => onTabChange(v as FollowersTab)}>
              <TabsList className="w-full">
                <TabsTrigger value="requests">
                  Requests{requests.length ? ` (${requests.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="mt-2">
                {requests.length === 0 ? (
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
                          Reject
                        </Button>
                      </PersonRow>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="followers" className="mt-2">
                {followers.length === 0 ? (
                  <EmptyState compact icon={Users} title="No followers yet" />
                ) : (
                  <ul className="divide-y divide-border">
                    {followers.map((follower) => (
                      <PersonRow
                        key={follower.persona_id}
                        person={follower}
                        detail={`Following since ${formatDateOnly(follower.followed_at)}`}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === follower.persona_id}
                          onClick={() => handleRemove(follower)}
                        >
                          Remove
                        </Button>
                      </PersonRow>
                    ))}
                  </ul>
                )}
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
  children,
}: {
  person: Follower;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <PersonaLink
        personaId={person.persona_id}
        anonymous={person.anonymous}
        name={displayName(person)}
        thumbnail={person.thumbnail || undefined}
        tabIndex={-1}
        className="shrink-0"
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={person.thumbnail || ""} />
          <GeneratedAvatarFallback name={displayName(person)} />
        </Avatar>
      </PersonaLink>
      <div className="min-w-0 flex-1">
        <PersonaLink
          personaId={person.persona_id}
          anonymous={person.anonymous}
          name={displayName(person)}
          thumbnail={person.thumbnail || undefined}
          className="block truncate text-sm font-medium"
        >
          {displayName(person)}
        </PersonaLink>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}
