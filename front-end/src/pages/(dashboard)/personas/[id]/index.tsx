import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UserRoundX } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { personaPath } from "@/components/persona-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchConnectedPersonas, fetchPersonaProfile } from "@/services/persona";
import { useWebsocketService } from "@/Websocket.context";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { FollowStatus, PersonaProfile, PublicPersona } from "@/types/persona";

type State =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "ready"; persona: PersonaProfile; connected: PublicPersona[] };

const fullName = (p: PublicPersona) => `${p.first_name} ${p.last_name}`.trim();

export default function PersonaProfilePage() {
  const { id = "" } = useParams<{ id: string }>();
  // Visibility depends on who is looking, so a persona switch reloads.
  const viewerId = useUserProfileStore((s) => s.persona?.id);
  const { websocketService } = useWebsocketService();
  const [state, setState] = useState<State>({ status: "loading" });
  const generation = useRef(0);

  // A background refetch (after a follow, or a live count change) keeps the
  // current view until the new data arrives.
  const load = useCallback(async (background = false) => {
    const gen = ++generation.current;
    if (!background) setState({ status: "loading" });
    const [persona, connected] = await Promise.all([
      fetchPersonaProfile(id),
      fetchConnectedPersonas(id),
    ]);
    if (gen !== generation.current) return;
    if (persona === "not_found") setState({ status: "not_found" });
    else if (persona === null) setState({ status: "error" });
    else setState({ status: "ready", persona, connected: connected ?? [] });
  }, [id]);

  useEffect(() => {
    load();
  }, [load, viewerId]);

  useEffect(() => {
    const personaId = Number(id);
    if (!personaId || !websocketService) return;
    return websocketService.subscribeToPersonaEvents(personaId, (msg) => {
      if (msg.event.name === "follow_counts") load(true);
    });
  }, [websocketService, id, load]);

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

      {state.status === "ready" && (
        <>
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
                  <span className="font-medium">{state.persona.followers_count}</span>{" "}
                  <span className="text-muted-foreground">followers</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="font-medium">{state.persona.following_count}</span>{" "}
                  <span className="text-muted-foreground">following</span>
                </p>
                {state.persona.bio && (
                  <p className="pt-2 text-sm whitespace-pre-line break-words">{state.persona.bio}</p>
                )}
              </div>
              {String(state.persona.id) !== String(viewerId) && (
                <FollowButton
                  personaId={state.persona.id}
                  name={fullName(state.persona)}
                  status={state.persona.follow_status ?? null}
                  requiresApproval={state.persona.requires_approval}
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
        </>
      )}
    </div>
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
