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
import { formatDateOnly } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

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
  const { t } = useTranslation(["personas", "common"]);
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
      toast.error(errorMessage((err as Error).message));
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(
      decision === "approve"
        ? t("invite.nowFollowsNamed", { name: displayName(request) })
        : t("common:requests.rejected", { name: displayName(request) })
    );
    load();
  };

  const handleRemove = async (follower: ActiveFollower) => {
    if (!confirm(t("followers.removeConfirm", { name: displayName(follower) }))) return;
    setBusyId(follower.persona_id);
    try {
      await removeFollower(personaId, follower.persona_id);
    } catch (err) {
      toast.error(errorMessage((err as Error).message));
      return;
    } finally {
      setBusyId(null);
    }
    toast.success(t("common:members.removed", { name: displayName(follower) }));
    setFollowers((prev) => prev.filter((f) => f.persona_id !== follower.persona_id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("settings.followers.title")}</SheetTitle>
          <SheetDescription>{t("followers.lead")}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {loading && !requests.length && !followers.length ? (
            <SkeletonList count={3} />
          ) : loadError ? (
            <ErrorState compact title={t("followers.loadFailed")} onRetry={load} />
          ) : (
            <Tabs value={tab} onValueChange={(v) => onTabChange(v as FollowersTab)}>
              <TabsList className="w-full">
                <TabsTrigger value="requests">
                  {requests.length ? t("followers.requestsTab", { n: requests.length }) : t("common:requests.title")}
                </TabsTrigger>
                <TabsTrigger value="followers">{t("followers.followersTab", { n: followers.length })}</TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="mt-2">
                {requests.length === 0 ? (
                  <EmptyState compact icon={UserPlus} title={t("common:requests.none")} />
                ) : (
                  <ul className="divide-y divide-border">
                    {requests.map((request) => (
                      <PersonRow
                        key={request.persona_id}
                        person={request}
                        detail={t("common:requests.askedOn", { date: formatDateOnly(request.requested_at) })}
                      >
                        <Button
                          size="sm"
                          disabled={busyId === request.persona_id}
                          onClick={() => handleResolve(request, "approve")}
                        >
                          {t("common:actions.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === request.persona_id}
                          onClick={() => handleResolve(request, "reject")}
                        >
                          {t("common:actions.reject")}
                        </Button>
                      </PersonRow>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="followers" className="mt-2">
                {followers.length === 0 ? (
                  <EmptyState compact icon={Users} title={t("settings.followers.none")} />
                ) : (
                  <ul className="divide-y divide-border">
                    {followers.map((follower) => (
                      <PersonRow
                        key={follower.persona_id}
                        person={follower}
                        detail={t("followers.since", { date: formatDateOnly(follower.followed_at) })}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === follower.persona_id}
                          onClick={() => handleRemove(follower)}
                        >
                          {t("common:actions.remove")}
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
