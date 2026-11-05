import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { formatCompact } from "@/lib/format";
import { useTranslation } from "react-i18next";

export type BarChannel = {
  id: number | string;
  name: string;
  thumbnailUrl?: string | null;
  membersCount?: number | null;
  isPrivate: boolean;
};

export function JoinButton({
  isPrivate,
  isPending,
  busy,
  onJoin,
}: {
  isPrivate: boolean;
  isPending: boolean;
  busy: boolean;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  return isPending ? (
    <Button size="sm" variant="outline" className="shrink-0" loading={busy} onClick={onJoin}>
      <Clock />
      {t("actions.requested")}
    </Button>
  ) : (
    <Button size="sm" className="shrink-0" loading={busy} onClick={onJoin}>
      {isPrivate ? t("actions.requestToJoin") : t("actions.join")}
    </Button>
  );
}

export function ChannelBar({
  channel,
  isMember,
  isPending,
  busy,
  onJoin,
}: {
  channel: BarChannel;
  isMember: boolean;
  isPending: boolean;
  busy: boolean;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const channelPath = `/channels/${channel.id}`;
  // "default" is the first entry of this tab: there is nothing in-app to go back to.
  const back = () => (location.key !== "default" ? navigate(-1) : navigate(channelPath));

  return (
    <div className="sticky top-14 z-10 border-b bg-background/95 backdrop-blur md:top-0">
      <div className="flex h-14 items-center gap-3 px-4 md:px-8">
        <Button variant="ghost" size="icon-sm" aria-label={t("actions.back")} onClick={back}>
          <ArrowLeft className="rtl:-scale-x-100" />
        </Button>
        <Link to={channelPath} className="flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo name={channel.name} src={channel.thumbnailUrl} size="sm" />
          <span className="flex min-w-0 flex-col">
            <bdi className="truncate text-match-parent text-sm font-medium">{channel.name}</bdi>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              {t("counts.members", { count: channel.membersCount ?? 0, n: formatCompact(channel.membersCount ?? 0) })} ·{" "}
              {channel.isPrivate ? t("visibility.private") : t("visibility.public")}
            </span>
          </span>
        </Link>
        <div className="ms-auto">
          {!isMember && <JoinButton isPrivate={channel.isPrivate} isPending={isPending} busy={busy} onJoin={onJoin} />}
        </div>
      </div>
    </div>
  );
}
