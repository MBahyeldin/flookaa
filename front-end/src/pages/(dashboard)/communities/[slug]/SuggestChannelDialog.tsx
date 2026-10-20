import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Loader2, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { cancelChannelRequest, requestChannelJoin } from "@/services/communities";
import type { Community, ModeratedChannel } from "@/types/community";

const errors: Record<string, string> = {
  recently_rejected: "This community declined the channel recently. You can ask again 30 days after.",
  channel_in_community: "This channel is already in a community.",
  channel_request_pending: "This channel is already waiting on a community.",
};

/** The channels the viewer moderates, each with where it stands; onChanged reloads them. */
export default function SuggestChannelDialog({
  community,
  channels,
  open,
  onOpenChange,
  onChanged,
}: {
  community: Community;
  channels: ModeratedChannel[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = async (channel: ModeratedChannel, cancel: boolean) => {
    setBusyId(channel.id);
    const r = cancel ? await cancelChannelRequest(community.id, channel.id) : await requestChannelJoin(community.id, channel.id);
    setBusyId(null);
    if (!r.ok) {
      toast.error(errors[r.error] ?? "Couldn't update the request. Please try again.");
    } else {
      toast.success(cancel ? "Request cancelled" : `${channel.name} was suggested. A manager will review it.`);
    }
    onChanged();
  };

  const status = (channel: ModeratedChannel) => {
    const here = channel.community?.id === community.id;
    if (channel.community_status === "none") {
      return (
        <Button size="sm" disabled={busyId === channel.id} onClick={() => run(channel, false)}>
          Suggest
        </Button>
      );
    }
    if (here && channel.community_status === "pending") {
      return (
        <Button size="sm" variant="secondary" disabled={busyId === channel.id} onClick={() => run(channel, true)}>
          <Clock className="mr-1 h-4 w-4" />
          Cancel request
        </Button>
      );
    }
    if (here) return <span className="text-xs text-muted-foreground">In this community</span>;
    return (
      <span className="truncate text-xs text-muted-foreground">
        {channel.community_status === "active" ? "In" : "Waiting on"} {channel.community?.name}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggest a channel</DialogTitle>
          <DialogDescription>
            Pick a channel you moderate. {community.name}'s managers decide whether it joins. A channel can be in one community
            at a time.
          </DialogDescription>
        </DialogHeader>
        {channels === null ? (
          <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : channels.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">You don't moderate any channels yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {channels.map((channel) => (
              <li key={channel.id} className="flex items-center gap-3 py-3">
                <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                  <AvatarImage src={channel.thumbnail || ""} className="object-cover" />
                  <GeneratedAvatarFallback name={channel.name} className="rounded-lg" />
                </Avatar>
                <span className="flex min-w-0 flex-1 items-center gap-1 text-sm font-medium">
                  <span className="truncate">{channel.name}</span>
                  {channel.visibility === "private" && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private" />}
                </span>
                <div className="flex max-w-[45%] shrink-0 items-center">{status(channel)}</div>
              </li>
            ))}
          </ul>
        )}
        <Link
          to={`/channels/create?community=${community.id}`}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Plus className="h-4 w-4" />
          Create a new channel for {community.name}
        </Link>
      </DialogContent>
    </Dialog>
  );
}
