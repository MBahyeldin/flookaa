import { Check, Clock, Ellipsis, Globe, Link2, Lock, Plus, Send, Settings, Users } from "lucide-react";
import { Link } from "react-router-dom";
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
import { useTranslation } from "react-i18next";
import type { Community } from "@/types/community";

const factLink =
  "cursor-pointer rounded-sm hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring";

export function CommunityHero({
  community,
  canSeeInside,
  canSuggest,
  busy,
  onJoin,
  onLeave,
  onFollow,
  onMembers,
  onManage,
  onSuggest,
}: {
  community: Community;
  canSeeInside: boolean;
  canSuggest: boolean;
  busy: "join" | "follow" | null;
  onJoin: () => void;
  onLeave: () => void;
  onFollow: () => void;
  onMembers: () => void;
  onManage: () => void;
  onSuggest: () => void;
}) {
  const { t } = useTranslation(["communities", "common", "channels"]);
  const isPrivate = community.visibility === "private";
  const status = community.membership_status;
  const members = t("common:counts.members", { count: community.members_count, n: formatCompact(community.members_count) });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      toast.success(t("common:share.copied"));
    } catch {
      toast.error(t("common:share.copyFailed"));
    }
  };

  const joinProps = { className: "flex-1 md:flex-none", loading: busy === "join", disabled: !!busy };
  const joinButton = community.is_owner ? null : status === "active" ? (
    <Button variant="secondary" {...joinProps} onClick={onLeave}>
      <Check />
      {t("common:actions.joined")}
    </Button>
  ) : status === "pending" ? (
    <Button variant="outline" {...joinProps} onClick={onLeave}>
      <Clock />
      {t("common:actions.requested")}
    </Button>
  ) : status === "rejected" ? (
    <Button variant="outline" className="flex-1 md:flex-none" disabled>
      {t("hero.declined")}
    </Button>
  ) : (
    <Button {...joinProps} onClick={onJoin}>
      {isPrivate ? t("common:actions.requestToJoin") : t("hero.join")}
    </Button>
  );

  return (
    <Hero
      cover={<Cover pattern={community.cover_pattern} src={community.banner} focus={{ x: community.banner_x, y: community.banner_y }} />}
      media={
        <>
          <Logo name={community.name} src={community.thumbnail} size="lg" className="md:hidden" />
          <Logo name={community.name} src={community.thumbnail} size="xl" className="max-md:hidden" />
        </>
      }
      tags={
        <>
          <Badge variant="secondary">
            {isPrivate ? <Lock /> : <Globe />}
            {isPrivate ? t("common:visibility.private") : t("common:visibility.public")}
          </Badge>
          <AgeBadge minAge={community.min_age} />
        </>
      }
      name={community.name}
      tagline={community.description}
      facts={
        <>
          {canSeeInside ? (
            <button type="button" className={factLink} onClick={onMembers}>
              {members}
            </button>
          ) : (
            members
          )}
          {!isPrivate &&
            ` · ${t("common:counts.followers", { count: community.followers_count, n: formatCompact(community.followers_count) })}`}
          {` · ${t("common:counts.channels", { count: community.channels_count, n: formatCompact(community.channels_count) })}`}
        </>
      }
      actions={
        <>
          {joinButton}
          {!isPrivate && (
            <Button
              variant="outline"
              className="flex-1 md:flex-none"
              loading={busy === "follow"}
              disabled={!!busy}
              onClick={onFollow}
            >
              {community.following ? t("common:actions.following") : t("common:actions.follow")}
            </Button>
          )}
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
              {canSuggest && (
                <DropdownMenuItem onSelect={onSuggest}>
                  <Send className="rtl:-scale-x-100" />
                  {t("suggest.title")}
                </DropdownMenuItem>
              )}
              {community.can_manage && (
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
                  <DropdownMenuItem asChild>
                    <Link to={`/channels/create?community=${community.id}`}>
                      <Plus />
                      {t("channels:create.submit")}
                    </Link>
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
