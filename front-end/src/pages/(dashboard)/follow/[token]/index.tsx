import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Link2Off } from "lucide-react";
import { toast } from "sonner";
import { LockedPersonaCard } from "@/components/locked-persona-card";
import { personaPath } from "@/components/persona-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInvite, requestViaInvite } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useWebsocketService } from "@/Websocket.context";
import type { FollowStatus } from "@/types/persona";

type State =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "unauthenticated" }
  | { status: "error" }
  | { status: "locked"; follow_status: FollowStatus };

export default function FollowInvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const viewerId = useUserProfileStore((s) => s.persona?.id);
  const viewerPrivacy = useUserProfileStore((s) => s.persona?.privacy);
  const { websocketService } = useWebsocketService();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async (background = false) => {
    const gen = ++generation.current;
    if (!background) setState({ status: "loading" });
    const invite = await fetchInvite(token);
    if (gen !== generation.current) return;
    if (invite === "not_found" || invite === "unauthenticated") setState({ status: invite });
    else if (invite === null) setState({ status: "error" });
    else if (invite.visible) navigate(personaPath(invite.persona_id), { replace: true });
    else setState({ status: "locked", follow_status: invite.follow_status });
  }, [token, navigate]);

  useEffect(() => {
    load();
  }, [load, viewerId]);

  // The persona can't be subscribed to, but an approval also updates the viewer's own counts.
  const locked = state.status === "locked";
  useEffect(() => {
    if (!locked || !viewerId || !websocketService) return;
    return websocketService.subscribeToPersonaEvents(Number(viewerId), (msg) => {
      if (msg.event.name === "follow_counts") load(true);
    });
  }, [locked, viewerId, websocketService, load]);

  const request = async () => {
    if (busy) return;
    if (
      viewerPrivacy &&
      viewerPrivacy !== "public" &&
      !confirm("Follow this persona? It will see who you are.")
    ) {
      return;
    }
    setBusy(true);
    const result = await requestViaInvite(token);
    setBusy(false);
    if (result instanceof Error) {
      toast.error(result.message);
      return;
    }
    load(true);
  };

  const next = encodeURIComponent(`/follow/${token}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {state.status === "loading" && <Skeleton className="h-56 w-full rounded-xl" />}

      {state.status === "not_found" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Link2Off className="h-10 w-10" />
          <p className="text-lg font-medium text-foreground">This link is no longer valid</p>
          <p className="text-sm">Ask for a new one.</p>
        </div>
      )}

      {state.status === "unauthenticated" && (
        <LockedPersonaCard>
          <Button asChild>
            <Link to={`/login?next=${next}`}>Log in to request to follow</Link>
          </Button>
        </LockedPersonaCard>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">Couldn't load this link.</p>
          <Button variant="outline" onClick={() => load()}>
            Retry
          </Button>
        </div>
      )}

      {state.status === "locked" && (
        <LockedPersonaCard>
          {state.follow_status ? (
            <Button size="sm" variant="secondary" disabled>
              Requested
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={request}>
              Request to follow
            </Button>
          )}
        </LockedPersonaCard>
      )}
    </div>
  );
}
