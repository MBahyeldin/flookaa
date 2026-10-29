import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CommunityPicker } from "@/components/community-picker";
import { FieldError } from "@/components/create-form/fields";
import { useConfirm } from "@/components/confirm-dialog";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Logo } from "@/components/ui/logo";
import { SkeletonList } from "@/components/ui/skeleton";
import { cancelChannelRequest, removeCommunityChannel, requestChannelJoin } from "@/services/communities";
import type { ChannelCommunityState, MyCommunity } from "@/types/community";
import { formatDateOnly } from "@/utils/formateDate";

const REQUEST_ERRORS: Record<string, string> = {
  channel_in_community: "This channel is already in a community.",
  channel_request_pending: "This channel is already waiting on a community.",
  recently_rejected: "That community declined this channel less than 30 days ago.",
};

/** state: undefined while loading, null when it failed. */
export function ChannelCommunitySection({
  channelId,
  state,
  onRetry,
  onChanged,
}: {
  channelId: string;
  state: ChannelCommunityState | null | undefined;
  onRetry: () => void;
  onChanged: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirm, confirmDialog] = useConfirm();
  const id = Number(channelId);

  const suggest = async (community: MyCommunity) => {
    setBusy(true);
    setError(undefined);
    const r = await requestChannelJoin(community.id, id);
    setBusy(false);
    if (!r.ok) {
      setError(REQUEST_ERRORS[r.error] ?? "Couldn't send the request. Try again.");
      return;
    }
    toast.success(`Sent to ${community.name}'s managers`);
    onChanged();
  };

  const act = async (leave: boolean) => {
    const community = state?.community;
    if (!community) return;
    if (
      leave &&
      !(await confirm({
        title: `Take this channel out of ${community.name}?`,
        body: "It stays as it is, with its members and posts. Getting back in needs a new request.",
        confirmLabel: "Take out",
        destructive: true,
      }))
    )
      return;
    setBusy(true);
    const r = leave ? await removeCommunityChannel(community.id, id) : await cancelChannelRequest(community.id, id);
    setBusy(false);
    if (!r.ok) {
      toast.error("Couldn't update the community. Try again.");
      return;
    }
    toast.success(leave ? `The channel left ${community.name}` : "Request cancelled");
    onChanged();
  };

  const picker = (
    <>
      <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => setPicking(true)}>
        Suggest to a community
      </Button>
      <CommunityPicker open={picking} onOpenChange={setPicking} value={null} onPick={suggest} request />
    </>
  );

  let body;
  if (state === undefined) body = <SkeletonList count={1} />;
  else if (state === null) body = <ErrorState compact title="Couldn't load the community" onRetry={onRetry} />;
  else if (!state.community || state.status === "none") {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
        <span className="text-sm text-muted-foreground">Not in a community.</span>
        {picker}
      </div>
    );
  } else {
    const c = state.community;
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-surface-sunken p-3">
          <span data-theme={c.theme}>
            <Logo name={c.name} src={c.thumbnail || null} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link to={`/communities/${c.slug}`} className="truncate text-sm font-semibold hover:underline">
              {c.name}
            </Link>
            <span className="text-xs text-muted-foreground">
              {state.status === "active" && "The channel shows on the community's page."}
              {state.status === "pending" && "Waiting for its managers to approve."}
              {state.status === "rejected" &&
                `Declined. You can ask again on ${state.rejected_until ? formatDateOnly(state.rejected_until) : "a later date"}.`}
            </span>
          </div>
          {state.status === "pending" && <Badge variant="secondary">Pending</Badge>}
          {state.status === "active" && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive" loading={busy} onClick={() => act(true)}>
              Take out of community
            </Button>
          )}
          {state.status === "pending" && (
            <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => act(false)}>
              Cancel request
            </Button>
          )}
        </div>
        {state.status === "rejected" && <div>{picker}</div>}
      </div>
    );
  }

  return (
    <SettingsSection id="community" title="Community" lead="A community groups channels about the same topics.">
      {body}
      <FieldError>{error}</FieldError>
      {confirmDialog}
    </SettingsSection>
  );
}
