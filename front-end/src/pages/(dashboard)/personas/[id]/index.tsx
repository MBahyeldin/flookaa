import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Lock, UserPlus, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionNav, SectionNavContent, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import { fetchConnectedPersonas, fetchPersonaProfile, respondToInvitation } from "@/services/persona";
import { useWebsocketService } from "@/Websocket.context";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { FollowStatus, LockedPersona, PersonaProfile, PublicPersona } from "@/types/persona";
import FollowersSheet, { type FollowersTab } from "./FollowersSheet";
import ShareInviteLink from "./ShareInviteLink";
import { LockedProfileHero, ProfileHero, fullName } from "./ProfileHero";
import { ProfilePosts } from "./ProfilePosts";
import { ProfileChannels } from "./ProfileChannels";
import { ProfileConnected } from "./ProfileConnected";

type State =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "locked"; persona: LockedPersona }
  | { status: "ready"; persona: PersonaProfile; connected: PublicPersona[] };

type Tab = "posts" | "channels" | "connected";

const CONTENT = "mx-auto w-full max-w-[1192px] px-4 md:px-8 xl:px-16";

export default function PersonaProfilePage() {
  const { id = "" } = useParams<{ id: string }>();
  // Visibility depends on who is looking, so a persona switch reloads.
  const viewerId = useUserProfileStore((s) => s.persona?.id);
  const { websocketService } = useWebsocketService();
  const [state, setState] = useState<State>({ status: "loading" });
  const generation = useRef(0);
  const isOwn = !!id && String(id) === String(viewerId);
  const [searchParams, setSearchParams] = useSearchParams();
  const sheetParam = searchParams.get("followers");
  const sheetTab: FollowersTab | null =
    isOwn && (sheetParam === "requests" || sheetParam === "followers") ? sheetParam : null;
  const [followReload, setFollowReload] = useState(0);
  const [sharingLink, setSharingLink] = useState(false);

  const setParam = (key: string, value: string | null) =>
    setSearchParams(
      (params) => {
        if (value) params.set(key, value);
        else params.delete(key);
        return params;
      },
      { replace: true }
    );
  const setSheetTab = (tab: FollowersTab | null) => setParam("followers", tab);

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

  if (state.status === "loading") return <ProfileSkeleton />;

  if (state.status === "not_found") {
    return (
      <div className={`${CONTENT} py-8`}>
        <EmptyState icon={UserRoundX} title="Persona not found" body="It doesn't exist, or it isn't visible to you." />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={`${CONTENT} py-8`}>
        <ErrorState title="Couldn't load this persona" onRetry={() => load()} />
      </div>
    );
  }

  if (state.status === "locked") {
    return (
      <div className="min-h-full bg-background text-foreground">
        <LockedProfileHero persona={state.persona} onChange={() => load(true)} />
        <div className={`${CONTENT} pb-8`}>
          <EmptyState
            icon={Lock}
            title="Private persona"
            body="They see your persona when you ask to follow. Once they approve, the full profile appears here."
          />
        </div>
      </div>
    );
  }

  const { persona, connected } = state;
  const tabs: Tab[] = connected.length > 0 ? ["posts", "channels", "connected"] : ["posts", "channels"];
  const tabParam = searchParams.get("tab") as Tab;
  const tab: Tab = tabs.includes(tabParam) ? tabParam : "posts";

  return (
    <div data-theme={persona.theme} className="min-h-full bg-background text-foreground">
      <ProfileHero
        persona={persona}
        isOwn={isOwn}
        onFollowersClick={() => setSheetTab("followers")}
        onShareFollowLink={() => setSharingLink(true)}
        onChange={() => load(true)}
      />

      {persona.invited_you && viewerId && (
        <div className={`${CONTENT} pb-4`}>
          <InvitationBanner
            viewerId={Number(viewerId)}
            inviterId={persona.id}
            name={fullName(persona)}
            onDone={() => load(true)}
          />
        </div>
      )}

      <SectionNav value={tab} onValueChange={(next) => setParam("tab", next === "posts" ? null : next)}>
        <SectionNavList className="top-14 px-4 md:top-0 md:px-8 xl:px-16">
          <SectionNavTab value="posts">Posts</SectionNavTab>
          <SectionNavTab value="channels">Channels</SectionNavTab>
          {tabs.includes("connected") && <SectionNavTab value="connected">Connected</SectionNavTab>}
        </SectionNavList>

        <div className={`${CONTENT} py-6 md:py-8`}>
          <SectionNavContent value="posts">
            <ProfilePosts personaId={persona.id} name={fullName(persona)} isOwn={isOwn} />
          </SectionNavContent>
          <SectionNavContent value="channels">
            <ProfileChannels personaId={persona.id} isOwn={isOwn} />
          </SectionNavContent>
          {tabs.includes("connected") && (
            <SectionNavContent value="connected">
              <ProfileConnected personas={connected} viewerId={viewerId} onFollowChange={setConnectedStatus} />
            </SectionNavContent>
          )}
        </div>
      </SectionNav>

      {isOwn && (
        <FollowersSheet
          personaId={persona.id}
          open={sheetTab !== null}
          onOpenChange={(open) => setSheetTab(open ? "followers" : null)}
          tab={sheetTab ?? "followers"}
          onTabChange={setSheetTab}
          reloadKey={followReload}
        />
      )}
      {isOwn && persona.privacy === "private" && (
        <ShareInviteLink personaId={persona.id} open={sharingLink} onOpenChange={setSharingLink} />
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
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);

  const respond = async (decision: "accept" | "reject") => {
    setBusy(decision);
    try {
      await respondToInvitation(viewerId, inviterId, decision);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-lg bg-secondary px-4 py-3 text-secondary-foreground sm:flex-row sm:items-center"
    >
      <UserPlus aria-hidden="true" className="size-5 shrink-0 text-primary max-sm:hidden" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name} invited you to follow</p>
        <p className="text-xs text-muted-foreground">Accept to follow them. They already see who you are.</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" loading={busy === "accept"} disabled={!!busy} onClick={() => respond("accept")}>
          Accept
        </Button>
        <Button size="sm" variant="outline" loading={busy === "reject"} disabled={!!busy} onClick={() => respond("reject")}>
          Decline
        </Button>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading persona" className="pb-8">
      <Skeleton className="h-[150px] rounded-none md:h-[280px]" />
      <div className="flex flex-col gap-3 px-4 md:flex-row md:gap-6 md:px-8 xl:px-16">
        <Skeleton className="-mt-10 size-20 shrink-0 rounded-full md:-mt-14 md:size-[100px]" />
        <div className="flex w-full max-w-md flex-col gap-2 md:pt-[68px]">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
