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
import { formatDateOnly } from "@/lib/format";
import { useTranslation } from "react-i18next";

const REQUEST_ERRORS = ["channel_in_community", "channel_request_pending", "recently_rejected"] as const;

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
  const { t } = useTranslation(["channels", "common"]);
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
      const known = REQUEST_ERRORS.find((code) => code === r.error);
      setError(known ? t(`manage.requestErrors.${known}`) : t("manage.requestFailed"));
      return;
    }
    toast.success(t("manage.requestSent", { community: community.name }));
    onChanged();
  };

  const act = async (leave: boolean) => {
    const community = state?.community;
    if (!community) return;
    if (
      leave &&
      !(await confirm({
        title: t("manage.takeOutConfirm", { community: community.name }),
        body: t("manage.takeOutBody"),
        confirmLabel: t("manage.takeOut"),
        destructive: true,
      }))
    )
      return;
    setBusy(true);
    const r = leave ? await removeCommunityChannel(community.id, id) : await cancelChannelRequest(community.id, id);
    setBusy(false);
    if (!r.ok) {
      toast.error(t("manage.communityFailed"));
      return;
    }
    toast.success(leave ? t("manage.left", { community: community.name }) : t("manage.requestCancelled"));
    onChanged();
  };

  const picker = (
    <>
      <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => setPicking(true)}>
        {t("manage.suggest")}
      </Button>
      <CommunityPicker open={picking} onOpenChange={setPicking} value={null} onPick={suggest} request />
    </>
  );

  let body;
  if (state === undefined) body = <SkeletonList count={1} />;
  else if (state === null) body = <ErrorState compact title={t("manage.communityLoadFailed")} onRetry={onRetry} />;
  else if (!state.community || state.status === "none") {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
        <span className="text-sm text-muted-foreground">{t("create.noCommunity")}</span>
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
              {state.status === "active" && t("manage.statusActive")}
              {state.status === "pending" && t("manage.statusPending")}
              {state.status === "rejected" &&
                (state.rejected_until
                  ? t("manage.statusRejectedUntil", { date: formatDateOnly(state.rejected_until) })
                  : t("manage.statusRejected"))}
            </span>
          </div>
          {state.status === "pending" && <Badge variant="secondary">{t("common:status.pending")}</Badge>}
          {state.status === "active" && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive" loading={busy} onClick={() => act(true)}>
              {t("manage.takeOutLong")}
            </Button>
          )}
          {state.status === "pending" && (
            <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => act(false)}>
              {t("common:actions.cancelRequest")}
            </Button>
          )}
        </div>
        {state.status === "rejected" && <div>{picker}</div>}
      </div>
    );
  }

  return (
    <SettingsSection id="community" title={t("create.community")} lead={t("manage.communityLead")}>
      {body}
      <FieldError>{error}</FieldError>
      {confirmDialog}
    </SettingsSection>
  );
}
