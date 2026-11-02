import { Link } from "react-router-dom";
import { Check, Clock, Ellipsis, Globe, Link2, Lock, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { Hero } from "@/components/hero";
import { Cover } from "@/components/cover";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgeBadge } from "@/components/age-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCompact } from "@/lib/format";
import { Trans, useTranslation } from "react-i18next";
import type { CoverPattern } from "@/types/cover";

export type HeroChannel = {
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  coverPattern: CoverPattern;
  isPrivate: boolean;
  isOwner: boolean;
  minAge: number;
};

export function ChannelHero({
  channel,
  community,
  membersCount,
  followersCount,
  isJoined,
  isPending,
  isFollowing,
  busy,
  canModerate,
  onJoin,
  onFollow,
  onManage,
  onMembers,
}: {
  channel: HeroChannel;
  community: { name: string; slug: string } | null | undefined;
  membersCount: number;
  followersCount: number;
  isJoined: boolean;
  isPending: boolean;
  isFollowing: boolean;
  busy: "join" | "follow" | null;
  canModerate: boolean;
  onJoin: () => void;
  onFollow: () => void;
  onManage: () => void;
  onMembers: () => void;
}) {
  const { t } = useTranslation(["channels", "common"]);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      toast.success(t("common:share.copied"));
    } catch {
      toast.error(t("common:share.copyFailed"));
    }
  };

  const joinButton = channel.isOwner ? null : isJoined ? (
    <Button variant="secondary" className="flex-1 md:flex-none" loading={busy === "join"} disabled={!!busy} onClick={onJoin}>
      <Check />
      {t("common:actions.joined")}
    </Button>
  ) : isPending ? (
    <Button variant="outline" className="flex-1 md:flex-none" loading={busy === "join"} disabled={!!busy} onClick={onJoin}>
      <Clock />
      {t("common:actions.requested")}
    </Button>
  ) : (
    <Button className="flex-1 md:flex-none" loading={busy === "join"} disabled={!!busy} onClick={onJoin}>
      {channel.isPrivate ? t("common:actions.requestToJoin") : t("hero.join")}
    </Button>
  );

  return (
    <Hero
      cover={<Cover pattern={channel.coverPattern} />}
      media={
        <>
          <Logo name={channel.name} src={channel.thumbnailUrl} size="lg" className="md:hidden" />
          <Logo name={channel.name} src={channel.thumbnailUrl} size="xl" className="max-md:hidden" />
        </>
      }
      tags={
        <>
          <Badge variant="secondary">
            {channel.isPrivate ? <Lock /> : <Globe />}
            {channel.isPrivate ? t("common:visibility.private") : t("common:visibility.public")}
          </Badge>
          <AgeBadge minAge={channel.minAge} />
        </>
      }
      name={channel.name}
      tagline={channel.description}
      facts={
        <>
          {t("common:counts.members", { count: membersCount, n: formatCompact(membersCount) })} ·{" "}
          {t("common:counts.followers", { count: followersCount, n: formatCompact(followersCount) })}
          {community && (
            <>
              {" · "}
              <Trans
                t={t}
                i18nKey="partOfLink"
                values={{ community: community.name }}
                components={{
                  link: (
                    <Link
                      to={`/communities/${community.slug}`}
                      className="rounded-sm text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    />
                  ),
                }}
              />
            </>
          )}
        </>
      }
      actions={
        <>
          {joinButton}
          <Button variant="outline" className="flex-1 md:flex-none" loading={busy === "follow"} disabled={!!busy} onClick={onFollow}>
            {isFollowing ? t("common:actions.following") : t("common:actions.follow")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("common:actions.moreActions")} title={t("common:actions.moreActions")}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={copyLink}>
                <Link2 />
                {t("common:share.copyLink")}
              </DropdownMenuItem>
              {canModerate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onManage}>
                    <Settings />
                    {t("common:manage.title")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onMembers}>
                    <Users />
                    {t("common:manage.membersAndRequests")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
