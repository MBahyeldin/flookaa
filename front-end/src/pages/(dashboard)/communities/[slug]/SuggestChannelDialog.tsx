import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Hash, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { cancelChannelRequest, requestChannelJoin } from "@/services/communities";
import type { Community, ModeratedChannel } from "@/types/community";
import { useTranslation } from "react-i18next";
import { isolate } from "@/i18n";

const KNOWN_ERRORS = ["recently_rejected", "channel_in_community", "channel_request_pending"] as const;

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
  const { t } = useTranslation(["communities", "common", "channels"]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = async (channel: ModeratedChannel, cancel: boolean) => {
    setBusyId(channel.id);
    const r = cancel ? await cancelChannelRequest(community.id, channel.id) : await requestChannelJoin(community.id, channel.id);
    setBusyId(null);
    if (!r.ok) {
      const known = KNOWN_ERRORS.find((code) => code === r.error);
      toast.error(known ? t(`suggest.errors.${known}`) : t("common:requests.updateFailed"));
    } else {
      toast.success(cancel ? t("channels:manage.requestCancelled") : t("suggest.sent", { channel: channel.name }));
    }
    onChanged();
  };

  const status = (channel: ModeratedChannel) => {
    const here = channel.community?.id === community.id;
    if (channel.community_status === "none") {
      return (
        <Button size="sm" disabled={busyId === channel.id} onClick={() => run(channel, false)}>
          {t("suggest.action")}
        </Button>
      );
    }
    if (here && channel.community_status === "pending") {
      return (
        <Button size="sm" variant="secondary" disabled={busyId === channel.id} onClick={() => run(channel, true)}>
          <Clock className="me-1 h-4 w-4" />
          {t("common:actions.cancelRequest")}
        </Button>
      );
    }
    if (here) return <span className="text-xs text-muted-foreground">{t("suggest.inThis")}</span>;
    return (
      <span className="truncate text-xs text-muted-foreground">
        {channel.community_status === "active"
          ? t("suggest.inOther", { community: isolate(channel.community?.name ?? "") })
          : t("suggest.waitingOn", { community: isolate(channel.community?.name ?? "") })}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("suggest.title")}</DialogTitle>
          <DialogDescription>{t("suggest.lead", { community: isolate(community.name) })}</DialogDescription>
        </DialogHeader>
        {channels === null ? (
          <SkeletonList count={3} />
        ) : channels.length === 0 ? (
          <EmptyState
            compact
            icon={Hash}
            title={t("suggest.none")}
            action={
              <Button asChild>
                <Link to={`/channels/create?community=${community.id}`}>{t("channels:create.submit")}</Link>
              </Button>
            }
          />
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
                  {channel.visibility === "private" && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={t("common:visibility.private")} />}
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
          {t("suggest.createFor", { community: isolate(community.name) })}
        </Link>
      </DialogContent>
    </Dialog>
  );
}
