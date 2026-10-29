import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Hash, Lock } from "lucide-react";
import { toast } from "sonner";
import { CommunityRulesDialog } from "@/components/community-rules-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionNav, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import NotFound from "@/components/not-found";
import {
  followCommunity,
  getCommunity,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
  listChannelRequests,
  listCommunityRequests,
  listModeratedChannels,
  removeCommunityChannel,
  unfollowCommunity,
} from "@/services/communities";
import { getChannels } from "@/services/channels";
import { useWebsocketService } from "@/Websocket.context";
import type { Channel } from "@/types/channel";
import type { Community, ModeratedChannel } from "@/types/community";
import { useNotificationStore } from "@/stores/NotificationStore";
import { useSectionSpy } from "@/hooks/useSectionSpy";
import { formatDateOnly } from "@/utils/formateDate";
import { ChannelTile } from "@/components/tile/ChannelTile";
import { CommunityManageSheet } from "./manage/CommunityManageSheet";
import MembersSheet, { type MembersTab } from "./MembersSheet";
import SuggestChannelDialog from "./SuggestChannelDialog";
import { CommunityHero } from "./CommunityHero";
import { CommunityAbout } from "./CommunityAbout";
import { CommunityPeople } from "./CommunityPeople";

const membersTabs: MembersTab[] = ["members", "requests", "channels"];
const SECTIONS = ["channels", "about", "people"] as const;
const SHOWN_CHANNELS = 6;
const sectionClass = "scroll-mt-28 md:scroll-mt-14";

export default function CommunityPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { websocketService } = useWebsocketService();
  const [community, setCommunity] = useState<Community | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [channelsFailed, setChannelsFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const linkedTab = searchParams.get("members") as MembersTab | null;
  const [membersTab, setMembersTab] = useState<MembersTab | null>(
    linkedTab && membersTabs.includes(linkedTab) ? linkedTab : null,
  );
  const [membersKey, setMembersKey] = useState(0);
  const [requestsKey, setRequestsKey] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [channelRequestsKey, setChannelRequestsKey] = useState(0);
  const [pendingChannelRequests, setPendingChannelRequests] = useState(0);
  const [moderated, setModerated] = useState<ModeratedChannel[] | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [busy, setBusy] = useState<"join" | "follow" | null>(null);
  const [allChannels, setAllChannels] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setCommunity(null);
    setChannels(null);
    setChannelsFailed(false);
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
  }, [slug, attempt]);

  const communityId = community?.id;
  // Matches the server: a private community's members and channels are for members and managers.
  const canSeeInside =
    !!community &&
    (community.visibility !== "private" || community.membership_status === "active" || !!community.can_manage);

  const loadChannels = useCallback(async () => {
    if (!communityId || !canSeeInside) return;
    const response = await getChannels({ communityId, limit: 100 });
    // A failed refresh keeps the list already shown.
    setChannelsFailed(!response);
    if (response) setChannels(response.channels ?? []);
  }, [communityId, canSeeInside]);

  // By id, so a slug change made elsewhere is followed.
  const reloadCommunity = useCallback(async () => {
    if (!communityId) return;
    const r = await getCommunity(communityId);
    // E.g. an age limit the viewer no longer meets.
    if (!r.ok && r.error === "community not found") setState("missing");
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
    if (!communityId || !canManage) return;
    let alive = true;
    listChannelRequests(communityId).then((r) => {
      if (alive && r.ok) setPendingChannelRequests(r.data.requests.length);
    });
    return () => {
      alive = false;
    };
  }, [communityId, canManage, channelRequestsKey]);

  const loadModerated = useCallback(async () => {
    const r = await listModeratedChannels();
    if (r.ok) setModerated(r.data.channels);
  }, []);

  useEffect(() => {
    loadModerated();
  }, [loadModerated]);

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
      if (msg.event.name === "channel_request") setChannelRequestsKey((k) => k + 1);
      if (msg.event.name === "moderator") {
        reloadCommunity();
        setMembersKey((k) => k + 1);
      }
    });
    // canManage: /control only sends join requests to managers, so a new role resubscribes.
  }, [communityId, websocketService, loadChannels, reloadCommunity, canManage]);

  // A requester can't hear join_request events; an answer reaches it as a notification.
  const notificationsVersion = useNotificationStore((s) => s.version);
  const isPending = community?.membership_status === "pending";
  useEffect(() => {
    if (isPending && notificationsVersion > 0) reloadCommunity();
  }, [notificationsVersion, isPending, reloadCommunity]);

  const onSaved = useCallback(
    (saved: Community) => {
      setCommunity(saved);
      if (saved.slug !== slug) navigate(`/communities/${saved.slug}`, { replace: true });
    },
    [slug, navigate],
  );

  const runAction = useCallback(
    async (kind: "join" | "follow", action: () => Promise<{ ok: boolean; error?: string }>, failure: string) => {
      setBusy(kind);
      const r = await action();
      setBusy(null);
      if (!r.ok) {
        toast.error(
          r.error === "cannot_follow_private"
            ? "Private communities can't be followed."
            : r.error === "recently_rejected"
              ? "This community declined your request recently."
              : failure,
        );
      }
      await reloadCommunity();
    },
    [reloadCommunity],
  );

  const openMembers = (tab: MembersTab | null) => {
    setMembersTab(tab);
    if (searchParams.has("members")) {
      searchParams.delete("members");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const removeChannel = async (channel: Channel) => {
    if (!community || !confirm(`Remove ${channel.name} from ${community.name}?`)) return;
    const r = await removeCommunityChannel(community.id, Number(channel.id));
    if (!r.ok) {
      toast.error("Couldn't remove the channel. Please try again.");
      return;
    }
    toast.success(`${channel.name} was removed from the community`);
    setChannels((prev) => prev?.filter((c) => c.id !== channel.id) ?? null);
  };

  const join = () => {
    if (!community) return;
    if (community.rules) {
      setRulesOpen(true);
      return;
    }
    runAction("join", () => joinCommunity(community.id), "Couldn't join. Please try again.");
  };

  const leave = () => {
    if (!community) return;
    const pending = community.membership_status === "pending";
    if (!confirm(pending ? "Cancel your request to join?" : `Leave ${community.name}?`)) return;
    runAction(
      "join",
      () => leaveCommunity(community.id),
      pending ? "Couldn't cancel the request. Please try again." : "Couldn't leave. Please try again.",
    );
  };

  const follow = () => {
    if (!community) return;
    if (community.following) runAction("follow", () => unfollowCommunity(community.id), "Couldn't unfollow. Please try again.");
    else runAction("follow", () => followCommunity(community.id), "Couldn't follow. Please try again.");
  };

  const suggest = () => {
    loadModerated();
    setSuggestOpen(true);
  };

  const [section, jump] = useSectionSpy(SECTIONS, !!community);

  if (state === "missing") return <NotFound />;
  if (state === "failed") {
    return <ErrorState className="mx-4 mt-24" title="Couldn't load this community" onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!community) return <CommunitySkeleton />;

  const canSuggest = !!moderated?.some((c) => c.community_status === "none" || c.community?.id === community.id);
  const declinedNote = community.rejected_until
    ? `Your request was declined. You can ask again on ${formatDateOnly(community.rejected_until)}.`
    : "Your request was declined.";
  const hiddenChannels = channels && !allChannels ? Math.max(channels.length - SHOWN_CHANNELS, 0) : 0;
  const shownChannels = channels && hiddenChannels > 0 ? channels.slice(0, SHOWN_CHANNELS) : channels;
  const notices = community.can_manage
    ? [
        pendingRequests > 0 && {
          tab: "requests" as const,
          label: pendingRequests === 1 ? "1 request to join" : `${pendingRequests} requests to join`,
        },
        pendingChannelRequests > 0 && {
          tab: "channels" as const,
          label:
            pendingChannelRequests === 1 ? "1 channel wants to join" : `${pendingChannelRequests} channels want to join`,
        },
      ].filter((n) => !!n)
    : [];

  return (
    <div data-theme={community.theme} className="min-h-full bg-background text-foreground">
      <CommunityHero
        community={community}
        canSeeInside={canSeeInside}
        canSuggest={canSuggest}
        busy={busy}
        onJoin={join}
        onLeave={leave}
        onFollow={follow}
        onMembers={() => openMembers("members")}
        onManage={() => setEditing(true)}
        onSuggest={suggest}
      />

      {(notices.length > 0 || community.membership_status === "rejected") && (
        <div className="-mt-2 flex flex-col gap-1 px-4 pb-5 text-sm md:-mt-4 md:px-8 md:pb-6 xl:px-16">
          {notices.length > 0 && (
            <p className="flex flex-wrap gap-x-2">
              {notices.map((n, i) => (
                <span key={n.tab} className="flex gap-2">
                  {i > 0 && <span className="text-muted-foreground">·</span>}
                  <button
                    type="button"
                    className="cursor-pointer rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => openMembers(n.tab)}
                  >
                    {n.label}
                  </button>
                </span>
              ))}
            </p>
          )}
          {community.membership_status === "rejected" && <p className="text-muted-foreground">{declinedNote}</p>}
        </div>
      )}

      <SectionNav value={section} onValueChange={(v) => jump(v as (typeof SECTIONS)[number])}>
        <SectionNavList className="top-14 px-4 md:top-0 md:px-8 xl:px-16">
          <SectionNavTab value="channels">Channels</SectionNavTab>
          <SectionNavTab value="about">About</SectionNavTab>
          <SectionNavTab value="people">People</SectionNavTab>
        </SectionNavList>
      </SectionNav>

      <div className="mx-auto flex w-full max-w-[1192px] flex-col gap-12 px-4 py-8 md:px-8 xl:px-16">
        <section id="channels" aria-labelledby="community-channels" className={`flex flex-col gap-6 ${sectionClass}`}>
          <SectionHeader
            overline="Channels"
            title={<span id="community-channels">In this community</span>}
            onSeeAll={hiddenChannels > 0 ? () => setAllChannels(true) : undefined}
            seeAllLabel={`See all ${channels?.length ?? ""}`}
          />
          {!canSeeInside ? (
            <EmptyState
              icon={Lock}
              title="Members only"
              body={
                community.membership_status === "pending"
                  ? "Your request is waiting for approval."
                  : community.membership_status === "rejected"
                    ? declinedNote
                    : "Join to see this community's channels."
              }
              action={
                community.membership_status === "none" && (
                  <Button onClick={join} loading={busy === "join"}>
                    Request to join
                  </Button>
                )
              }
            />
          ) : channels === null && channelsFailed ? (
            <ErrorState
              title="Couldn't load channels"
              onRetry={() => {
                setChannelsFailed(false);
                return loadChannels();
              }}
            />
          ) : shownChannels === null ? (
            <SkeletonList count={3} variant="post" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
          ) : shownChannels.length === 0 ? (
            <EmptyState
              icon={Hash}
              title="No channels in this community yet"
              action={
                community.can_manage ? (
                  <Button asChild>
                    <Link to={`/channels/create?community=${community.id}`}>Create channel</Link>
                  </Button>
                ) : canSuggest ? (
                  <Button onClick={suggest}>Suggest a channel</Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shownChannels.map((channel) =>
                community.can_manage ? (
                  <div key={channel.id} className="flex flex-col gap-2">
                    <ChannelTile channel={channel} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-end text-destructive hover:text-destructive"
                      onClick={() => removeChannel(channel)}
                    >
                      Remove from community
                    </Button>
                  </div>
                ) : (
                  <ChannelTile key={channel.id} channel={channel} />
                ),
              )}
            </div>
          )}
        </section>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div id="about" className={`lg:col-span-7 ${sectionClass}`}>
            <CommunityAbout community={community} />
          </div>
          <section id="people" className={`lg:col-span-5 ${sectionClass}`}>
            <CommunityPeople
              community={community}
              canSeeInside={canSeeInside}
              version={membersKey}
              onShowAll={() => openMembers("members")}
            />
          </section>
        </div>
      </div>

      <MembersSheet
        community={community}
        tab={membersTab}
        onTabChange={setMembersTab}
        onClose={() => openMembers(null)}
        membersKey={membersKey}
        requestsKey={requestsKey}
        channelRequestsKey={channelRequestsKey}
        onChannelAdded={() => setChannelRequestsKey((k) => k + 1)}
      />

      <SuggestChannelDialog
        community={community}
        channels={moderated}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        onChanged={loadModerated}
      />

      <CommunityRulesDialog
        community={community}
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        busy={!!busy}
        onAgree={() => runAction("join", () => joinCommunity(community.id), "Couldn't join. Please try again.")}
      />

      {community.can_manage && (
        <CommunityManageSheet
          community={community}
          pendingRequests={pendingRequests}
          open={editing}
          onOpenChange={setEditing}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div role="status" aria-label="Loading community" className="pb-8">
      <Skeleton className="h-[150px] rounded-none md:h-[280px]" />
      <div className="-mt-10 flex flex-col gap-3 px-4 md:-mt-14 md:px-8 xl:px-16">
        <Skeleton className="size-20 rounded-lg border-3 border-background md:size-28" />
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
    </div>
  );
}
