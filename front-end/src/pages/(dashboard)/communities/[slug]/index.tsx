import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Clock, Lock, Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import InterestChips from "@/components/interests/InterestChips";
import NotFound from "@/components/not-found";
import { PersonaLink } from "@/components/persona-link";
import {
  followCommunity,
  getCommunity,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
  listCommunityRequests,
  unfollowCommunity,
} from "@/services/communities";
import { getChannels } from "@/services/channels";
import { useWebsocketService } from "@/Websocket.context";
import type { Channel } from "@/types/channel";
import type { Community } from "@/types/community";
import { ChannelCard } from "../../channels/ChannelCard";
import CommunityForm from "../CommunityForm";
import MembersSheet, { type MembersTab } from "./MembersSheet";

export default function CommunityPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { websocketService } = useWebsocketService();
  const [community, setCommunity] = useState<Community | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [membersTab, setMembersTab] = useState<MembersTab | null>(null);
  const [membersKey, setMembersKey] = useState(0);
  const [requestsKey, setRequestsKey] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setCommunity(null);
    setChannels(null);
    setState("loading");
    getCommunityBySlug(slug).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setCommunity(r.data.community);
        setState("ready");
      } else {
        setState(r.error === "community not found" ? "missing" : "failed");
      }
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const communityId = community?.id;
  // Matches the server: a private community's members and channels are for members and managers.
  const canSeeInside =
    !!community &&
    (community.visibility !== "private" || community.membership_status === "active" || !!community.can_manage);

  const loadChannels = useCallback(async () => {
    if (!communityId || !canSeeInside) return;
    const response = await getChannels({ communityId, limit: 100 });
    setChannels(response?.channels ?? []);
  }, [communityId, canSeeInside]);

  // By id, so a slug change made elsewhere is followed.
  const reloadCommunity = useCallback(async () => {
    if (!communityId) return;
    const r = await getCommunity(communityId);
    if (!r.ok) return;
    setCommunity(r.data.community);
    if (r.data.community.slug !== slug) navigate(`/communities/${r.data.community.slug}`, { replace: true });
  }, [communityId, slug, navigate]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const canManage = !!community?.can_manage;
  useEffect(() => {
    if (!communityId || !canManage) return;
    let alive = true;
    listCommunityRequests(communityId).then((r) => {
      if (alive && r.ok) setPendingRequests(r.data.requests.length);
    });
    return () => {
      alive = false;
    };
  }, [communityId, canManage, requestsKey]);

  useEffect(() => {
    if (!communityId || !websocketService) return;
    return websocketService.subscribeToCommunityEvents(communityId, (msg) => {
      if (msg.event.name === "info") reloadCommunity();
      if (msg.event.name === "channels") {
        loadChannels();
        reloadCommunity();
      }
      if (msg.event.name === "counts") {
        reloadCommunity();
        setMembersKey((k) => k + 1);
      }
      if (msg.event.name === "join_request") setRequestsKey((k) => k + 1);
    });
  }, [communityId, websocketService, loadChannels, reloadCommunity]);

  const onSaved = useCallback(
    (saved: Community | null) => {
      setEditing(false);
      if (!saved) return;
      setCommunity(saved);
      if (saved.slug !== slug) navigate(`/communities/${saved.slug}`, { replace: true });
    },
    [slug, navigate],
  );

  const runAction = useCallback(
    async (action: () => Promise<{ ok: boolean; error?: string }>, failure: string) => {
      setBusy(true);
      const r = await action();
      setBusy(false);
      if (!r.ok) toast.error(r.error === "cannot_follow_private" ? "Private communities can't be followed." : failure);
      await reloadCommunity();
    },
    [reloadCommunity],
  );

  if (state === "missing") return <NotFound />;
  if (state === "failed") {
    return <p className="py-24 text-center text-destructive">Couldn't load this community. Please reload.</p>;
  }
  if (!community) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-8">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
    );
  }

  const owner = community.owner;
  const isPrivate = community.visibility === "private";

  const ownerName = owner ? [owner.first_name, owner.last_name].filter(Boolean).join(" ") : "";

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-40 overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 to-secondary sm:h-56">
        {community.banner && <img src={community.banner} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="-mt-10 flex flex-col gap-4 px-2 sm:flex-row sm:items-end sm:px-6">
        <Avatar className="h-20 w-20 rounded-2xl border-4 border-background">
          <AvatarImage src={community.thumbnail || ""} className="object-cover" />
          <GeneratedAvatarFallback name={community.name} className="rounded-2xl" />
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{community.name}</h1>
            {community.visibility === "private" && (
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" />
                Private
              </Badge>
            )}
          </div>
          {owner && (
            <p className="text-sm text-muted-foreground">
              Created by{" "}
              <PersonaLink
                personaId={owner.id}
                anonymous={owner.anonymous}
                name={ownerName}
                thumbnail={owner.thumbnail}
                className="font-medium text-foreground hover:underline"
              >
                {ownerName}
              </PersonaLink>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {community.membership_status === "none" && (
            <Button size="sm" disabled={busy} onClick={() => runAction(() => joinCommunity(community.id), "Couldn't join. Please try again.")}>
              {isPrivate ? "Request to join" : "Join"}
            </Button>
          )}
          {community.membership_status === "pending" && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                if (!confirm("Cancel your request to join?")) return;
                runAction(() => leaveCommunity(community.id), "Couldn't cancel the request. Please try again.");
              }}
            >
              <Clock className="mr-2 h-4 w-4" />
              Requested
            </Button>
          )}
          {community.membership_status === "active" && !community.is_owner && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Leave ${community.name}?`)) return;
                runAction(() => leaveCommunity(community.id), "Couldn't leave. Please try again.");
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Joined
            </Button>
          )}
          {!isPrivate && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                community.following
                  ? runAction(() => unfollowCommunity(community.id), "Couldn't unfollow. Please try again.")
                  : runAction(() => followCommunity(community.id), "Couldn't follow. Please try again.")
              }
            >
              {community.following ? "Following" : "Follow"}
            </Button>
          )}
          {community.can_manage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Link to={`/channels/create?community=${community.id}`}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create channel
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3 px-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {canSeeInside ? (
            <button type="button" className="flex items-center gap-1 hover:text-foreground hover:underline" onClick={() => setMembersTab("members")}>
              <Users className="h-4 w-4" />
              {community.members_count === 1 ? "1 member" : `${community.members_count} members`}
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {community.members_count === 1 ? "1 member" : `${community.members_count} members`}
            </span>
          )}
          {!isPrivate && (
            <span>{community.followers_count === 1 ? "1 follower" : `${community.followers_count} followers`}</span>
          )}
          {community.can_manage && pendingRequests > 0 && (
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMembersTab("requests")}>
              {pendingRequests === 1 ? "1 request to join" : `${pendingRequests} requests to join`}
            </button>
          )}
        </div>
        {community.description && <p className="max-w-3xl text-muted-foreground">{community.description}</p>}
        <InterestChips interests={community.interests} />
      </div>

      <section className="mt-10" aria-labelledby="community-channels">
        <h2 id="community-channels" className="mb-4 text-xl font-semibold">
          Channels
        </h2>
        {!canSeeInside ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center text-muted-foreground">
            <Lock className="h-6 w-6" />
            <p>You need to be a member of this community to see its channels.</p>
            {community.membership_status === "pending" ? (
              <p className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                Your request to join is waiting for approval.
              </p>
            ) : (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => runAction(() => joinCommunity(community.id), "Couldn't send your request. Please try again.")}
              >
                Request to join
              </Button>
            )}
          </div>
        ) : channels === null ? (
          <p className="py-8 text-muted-foreground">Loading channels...</p>
        ) : channels.length === 0 ? (
          <p className="py-8 text-muted-foreground">No channels in this community yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} hideCommunity />
            ))}
          </div>
        )}
      </section>

      <MembersSheet
        community={community}
        tab={membersTab}
        onTabChange={setMembersTab}
        onClose={() => setMembersTab(null)}
        membersKey={membersKey}
        requestsKey={requestsKey}
      />

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit community</SheetTitle>
            <SheetDescription>Changes show to everyone right away.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{editing && <CommunityForm community={community} onSaved={onSaved} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
