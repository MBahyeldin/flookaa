import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelChannelRequest, getChannelCommunity, removeCommunityChannel } from "@/services/communities";
import type { ChannelCommunityState } from "@/types/community";
import { formatDateOnly } from "@/utils/formateDate";

/** reloadKey changes when the page hears the channel's community row changed. */
export default function ChannelCommunityPanel({ channelId, reloadKey }: { channelId: string; reloadKey: number }) {
  const [state, setState] = useState<ChannelCommunityState | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await getChannelCommunity(channelId);
    setFailed(!r.ok);
    if (r.ok) setState(r.data);
  }, [channelId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (failed) return <p className="py-6 text-center text-sm text-muted-foreground">Couldn't load the community.</p>;
  if (!state) {
    return (
      <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const community = state.community;
  const act = async (leave: boolean) => {
    if (!community) return;
    if (leave && !confirm(`Take this channel out of ${community.name}?`)) return;
    setBusy(true);
    const r = leave ? await removeCommunityChannel(community.id, Number(channelId)) : await cancelChannelRequest(community.id, Number(channelId));
    setBusy(false);
    if (!r.ok) {
      toast.error("Couldn't update the community. Please try again.");
      return;
    }
    toast.success(leave ? `The channel left ${community.name}` : "Request cancelled");
    load();
  };

  const communityLink = community && (
    <Link to={`/communities/${community.slug}`} className="font-medium text-foreground hover:underline">
      {community.name}
    </Link>
  );

  return (
    <div className="space-y-4 py-4 text-sm">
      <p className="flex items-start gap-2 text-muted-foreground">
        <Boxes className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {state.status === "active" && <>Part of {communityLink}.</>}
          {state.status === "pending" && <>Waiting for {communityLink}'s managers to approve it.</>}
          {state.status === "rejected" && (
            <>
              {communityLink} declined this channel. You can ask again after{" "}
              {state.rejected_until ? formatDateOnly(state.rejected_until) : "30 days"}, or suggest it to another community.
            </>
          )}
          {state.status === "none" && <>Not in a community. Open a community's page and pick "Suggest a channel".</>}
        </span>
      </p>
      {state.status === "active" && (
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => act(true)}>
          Leave community
        </Button>
      )}
      {state.status === "pending" && (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act(false)}>
          Cancel request
        </Button>
      )}
      {(state.status === "none" || state.status === "rejected") && (
        <Link to="/communities" className="inline-block font-medium text-primary hover:underline">
          Browse communities
        </Link>
      )}
    </div>
  );
}
