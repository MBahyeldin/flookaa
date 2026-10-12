import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { UserRoundX } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { FollowButton } from "@/components/follow-button";
import { InviteButton } from "@/components/invite-button";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { LockedPersonaCard } from "@/components/locked-persona-card";
import { personaPath } from "@/components/persona-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchConnectedPersonas, fetchPersonaProfile, respondToInvitation } from "@/services/persona";
import { useWebsocketService } from "@/Websocket.context";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { FollowStatus, LockedPersona, PersonaProfile, PublicPersona } from "@/types/persona";
import FollowersSheet, { type FollowersTab } from "./FollowersSheet";
import ShareInviteLink from "./ShareInviteLink";

type State =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "locked"; persona: LockedPersona }
  | { status: "ready"; persona: PersonaProfile; connected: PublicPersona[] };

const fullName = (p: PublicPersona) => `${p.first_name} ${p.last_name}`.trim();

export default function PersonaProfilePage() {
  const { id = "" } = useParams<{ id: string }>();
  // Visibility depends on who is looking, so a persona switch reloads.
  const viewerId = useUserProfileStore((s) => s.persona?.id);
  const viewerPrivacy = useUserProfileStore((s) => s.persona?.privacy);
  const { websocketService } = useWebsocketService();
  const [state, setState] = useState<State>({ status: "loading" });
  const generation = useRef(0);
  const isOwn = !!id && String(id) === String(viewerId);
  const [searchParams, setSearchParams] = useSearchParams();
  const sheetParam = searchParams.get("followers");
  const sheetTab: FollowersTab | null =
    isOwn && (sheetParam === "requests" || sheetParam === "followers") ? sheetParam : null;
  const [followReload, setFollowReload] = useState(0);

  const setSheetTab = (tab: FollowersTab | null) =>
    setSearchParams(
      (params) => {
        if (tab) params.set("followers", tab);
        else params.delete("followers");
        return params;
      },
      { replace: true }
    );

  // A background refetch (after a follow, or a live count change) keeps the
  // current view until the new data arrives.
  const load = useCallback(async (background = false) => {
    const gen = ++generation.current;
    if (!background) setState({ status: "loading" });
    const persona = await fetchPersonaProfile(id);
    const connected = persona && persona !== "not_found" && !persona.locked
      ? await fetchConnectedPersonas(id)
      : null;
    if (gen !== generation.current) return;
    if (persona === "not_found") setState({ status: "not_found" });
    else if (persona === null) setState({ status: "error" });
    else if (persona.locked) setState({ status: "locked", persona });
    else setState({ status: "ready", persona, connected: connected ?? [] });
  }, [id]);

  useEffect(() => {
    load();
  }, [load, viewerId]);

  // A locked persona can't be subscribed to, but an approval also updates the
  // viewer's own counts.
  const locked = state.status === "locked";
  useEffect(() => {
    const personaId = Number(locked ? viewerId : id);
    if (!personaId || !websocketService) return;
    if (locked) {
      return websocketService.subscribeToPersonaEvents(personaId, (msg) => {
        if (msg.event.name === "follow_counts") load(true);
      });
    }
    return websocketService.subscribeToPersonaEvents(personaId, (msg) => {
      if (msg.event.name === "follow_counts") load(true);
      // Only your own profile receives these.
      if (msg.event.name === "follower" || msg.event.name === "follow_request") setFollowReload((n) => n + 1);
    });
  }, [websocketService, id, viewerId, locked, load]);

  // Invitations to you arrive on your own subjects, not the profile's.
  const visitingOther = state.status === "ready" && !isOwn;
  useEffect(() => {
    if (!visitingOther || !viewerId || !websocketService) return;
    return websocketService.subscribeToPersonaEvents(Number(viewerId), (msg) => {
      if (msg.event.name === "follow_invitation") load(true);
    });
  }, [websocketService, viewerId, visitingOther, load]);

  const setConnectedStatus = (personaId: number, follow_status: FollowStatus) =>
    setState((s) =>
      s.status === "ready"
        ? { ...s, connected: s.connected.map((p) => (p.id === personaId ? { ...p, follow_status } : p)) }
        : s
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {state.status === "loading" && <ProfileSkeleton />}

      {state.status === "not_found" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <UserRoundX className="h-10 w-10" />
          <p className="text-lg font-medium text-foreground">Persona not found</p>
          <p className="text-sm">It doesn't exist, or it isn't visible to you.</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">Couldn't load this persona.</p>
          <Button variant="outline" onClick={() => load()}>
            Retry
          </Button>
        </div>
      )}

      {state.status === "locked" && (
        <LockedPersonaCard>
          <FollowButton
            personaId={state.persona.id}
            status={state.persona.follow_status ?? null}
            requiresApproval
            followLabel="Request to follow"
            onChange={() => load(true)}
          />
        </LockedPersonaCard>
      )}

      {state.status === "ready" && (
        <>
          {state.persona.invited_you && viewerId && (
            <InvitationBanner
              viewerId={Number(viewerId)}
              inviterId={state.persona.id}
              name={fullName(state.persona)}
              onDone={() => load(true)}
            />
          )}
          <Card className="rounded-xl border border-border/70 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:items-start sm:text-left">
              <Avatar className="h-24 w-24 shrink-0">
                <AvatarImage src={state.persona.thumbnail || ""} />
                <GeneratedAvatarFallback name={fullName(state.persona)} />
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight break-words">
                  {fullName(state.persona)}
                </h1>
                <p className="text-sm text-muted-foreground">@{state.persona.slug}</p>
                <p className="text-sm">
                  {isOwn ? (
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => setSheetTab("followers")}
                    >
                      <span className="font-medium">{state.persona.followers_count}</span>{" "}
                      <span className="text-muted-foreground">followers</span>
                    </button>
                  ) : (
                    <>
                      <span className="font-medium">{state.persona.followers_count}</span>{" "}
                      <span className="text-muted-foreground">followers</span>
                    </>
                  )}
                  <span className="text-muted-foreground"> · </span>
                  <span className="font-medium">{state.persona.following_count}</span>{" "}
                  <span className="text-muted-foreground">following</span>
                </p>
                {state.persona.bio && (
                  <p className="pt-2 text-sm whitespace-pre-line break-words">{state.persona.bio}</p>
                )}
              </div>
              {isOwn && viewerPrivacy === "private" && <ShareInviteLink personaId={state.persona.id} />}
              {String(state.persona.id) !== String(viewerId) && state.persona.followable && (
                <FollowButton
                  personaId={state.persona.id}
                  name={fullName(state.persona)}
                  status={state.persona.follow_status ?? null}
                  requiresApproval={state.persona.requires_approval}
                  onChange={() => load(true)}
                />
              )}
              {!isOwn && state.persona.can_invite && (
                <InviteButton
                  personaId={state.persona.id}
                  name={fullName(state.persona)}
                  status={state.persona.invite_status ?? null}
                  onChange={() => load(true)}
                />
              )}
            </CardContent>
          </Card>

          {state.connected.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-medium">Connected personas</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {state.connected.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 p-3 shadow-sm transition-colors hover:bg-muted/50"
                  >
                    <Link to={personaPath(p.id)} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={p.thumbnail || ""} />
                        <GeneratedAvatarFallback name={fullName(p)} />
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{fullName(p)}</p>
                        <p className="truncate text-xs text-muted-foreground">@{p.slug}</p>
                      </div>
                    </Link>
                    {String(p.id) !== String(viewerId) && (
                      <FollowButton
                        personaId={p.id}
                        name={fullName(p)}
                        status={p.follow_status ?? null}
                        onChange={(status) => setConnectedStatus(p.id, status)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isOwn && (
            <FollowersSheet
              personaId={state.persona.id}
              open={sheetTab !== null}
              onOpenChange={(open) => setSheetTab(open ? "followers" : null)}
              tab={sheetTab ?? "followers"}
              onTabChange={setSheetTab}
              reloadKey={followReload}
            />
          )}
        </>
      )}
    </div>
  );
}

function InvitationBanner({
  viewerId,
  inviterId,
  name,
  onDone,
}: {
  viewerId: number;
  inviterId: number;
  name: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const respond = async (decision: "accept" | "reject") => {
    setBusy(true);
    try {
      await respondToInvitation(viewerId, inviterId, decision);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-4 rounded-xl border border-primary/40 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <span className="font-medium">{name}</span> invited you to follow them.
        </p>
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => respond("accept")}>
            Accept
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => respond("reject")}>
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/70 p-6 sm:flex-row sm:items-start">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="w-full max-w-xs space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
