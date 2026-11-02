import { Check, Heart, Inbox, MessageCircle, UserPlus, X, type LucideIcon } from "lucide-react";
import { t } from "@/i18n";
import type { Notification } from "@/types/notification";

export type NotificationDescription = {
  /** Shown in bold before the message; null when there's no actor. */
  actor: string | null;
  message: string;
  href: string;
  /** The kind's badge on the row's avatar or logo. */
  icon: LucideIcon;
  /** Where it happened, after the time; null when there's nothing to name. */
  context: string | null;
};

function actorName(n: Notification): string | null {
  if (!n.latest_actor) return null;
  return `${n.latest_actor.first_name} ${n.latest_actor.last_name}`.trim();
}

/** "Bob", "Bob and 1 other", "Bob and 4 others". */
function actors(n: Notification): string {
  const name = actorName(n) ?? t("notifications:someone");
  const others = n.count - 1;
  if (others <= 0) return name;
  return t("notifications:andOthers", { name, count: others });
}

function channelName(n: Notification): string {
  return n.channel?.name ?? t("notifications:aChannel");
}

function communityName(n: Notification): string {
  return n.community?.name ?? t("notifications:aCommunity");
}

function communityHref(n: Notification, query = ""): string {
  return n.community ? `/communities/${n.community.slug}${query}` : "/communities";
}

function contentContext(n: Notification, viewerId?: number): string | null {
  if (n.scope?.type !== "PERSONA") return n.channel?.name ?? null;
  if (n.scope.id === viewerId) return t("notifications:onYourWall");
  if (!n.wall) return null;
  return t("notifications:onWall", { name: `${n.wall.first_name} ${n.wall.last_name}`.trim() });
}

/**
 * Where a content notification leads: the post page when data.post_id is
 * known (rows written before it existed lack it), else its channel or wall.
 */
function contentHref(n: Notification): string {
  const base =
    n.scope?.type === "PERSONA" ? `/personas/${n.scope.id}` : `/channels/${n.scope?.id ?? n.channel?.id ?? ""}`;
  const postId = n.data?.post_id;
  if (!postId) return base;
  const query = n.subject.type === "COMMENT" ? `?${new URLSearchParams({ comment: n.subject.id })}` : "";
  return `${base}/posts/${postId}${query}`;
}

/**
 * Text and link for a notification, or null for a kind this build can't
 * render (the backend may add kinds first); those aren't shown.
 */
export function describeNotification(n: Notification, viewerId?: number): NotificationDescription | null {
  const content = contentContext(n, viewerId);
  const channel = n.channel?.name ?? null;
  const community = n.community?.name ?? null;
  switch (n.kind) {
    case "post_like":
      return {
        actor: actors(n),
        message: t("notifications:kinds.post_like"),
        href: contentHref(n),
        icon: Heart,
        context: content,
      };
    case "comment_like":
      return {
        actor: actors(n),
        message: t("notifications:kinds.comment_like"),
        href: contentHref(n),
        icon: Heart,
        context: content,
      };
    case "post_comment":
      return {
        actor: actors(n),
        message: t("notifications:kinds.post_comment"),
        href: contentHref(n),
        icon: MessageCircle,
        context: content,
      };
    case "comment_reply":
      return {
        actor: actors(n),
        message: t("notifications:kinds.comment_reply"),
        href: contentHref(n),
        icon: MessageCircle,
        context: content,
      };
    case "join_request":
      return {
        actor: actors(n),
        message: t("notifications:kinds.join_request", { channel: channelName(n) }),
        href: `/channels/${n.subject.id}`,
        icon: Inbox,
        context: channel,
      };
    case "request_approved":
      return {
        actor: null,
        message: t("notifications:kinds.request_approved", { channel: channelName(n) }),
        href: `/channels/${n.subject.id}`,
        icon: Check,
        context: channel,
      };
    case "removed_from_channel":
      return {
        actor: null,
        message: t("notifications:kinds.removed_from_channel", { channel: channelName(n) }),
        href: `/channels/${n.subject.id}`,
        icon: X,
        context: channel,
      };
    case "new_follower":
      return {
        actor: actors(n),
        message: t("notifications:kinds.new_follower"),
        href: `/personas/${n.subject.id}`,
        icon: UserPlus,
        context: null,
      };
    case "follow_request":
      return {
        actor: actors(n),
        message: t("notifications:kinds.follow_request"),
        href: `/personas/${n.subject.id}?followers=requests`,
        icon: Inbox,
        context: null,
      };
    case "follow_request_approved":
      return {
        actor: actorName(n) ?? t("notifications:someone"),
        message: t("notifications:kinds.follow_request_approved"),
        href: `/personas/${n.subject.id}`,
        icon: Check,
        context: null,
      };
    case "follow_invitation":
      return {
        actor: actorName(n) ?? t("notifications:someone"),
        message: t("notifications:kinds.follow_invitation"),
        href: `/personas/${n.subject.id}`,
        icon: UserPlus,
        context: null,
      };
    case "follow_invitation_accepted":
      return {
        actor: actorName(n) ?? t("notifications:someone"),
        message: t("notifications:kinds.follow_invitation_accepted"),
        href: `/personas/${n.subject.id}`,
        icon: Check,
        context: null,
      };
    case "channel_request":
      return {
        actor: actors(n),
        message: t("notifications:kinds.channel_request", { count: n.count, community: communityName(n) }),
        href: communityHref(n, "?members=channels"),
        icon: Inbox,
        context: community,
      };
    case "channel_request_approved":
      return {
        actor: null,
        message: t("notifications:kinds.channel_request_approved", { channel: channelName(n), community: communityName(n) }),
        href: communityHref(n),
        icon: Check,
        context: community,
      };
    case "channel_request_rejected":
      return {
        actor: null,
        message: t("notifications:kinds.channel_request_rejected", { channel: channelName(n), community: communityName(n) }),
        href: n.channel ? `/channels/${n.channel.id}` : communityHref(n),
        icon: X,
        context: community,
      };
    case "community_join_request":
      return {
        actor: actors(n),
        message: t("notifications:kinds.community_join_request", { community: communityName(n) }),
        href: communityHref(n, "?members=requests"),
        icon: Inbox,
        context: community,
      };
    case "community_request_approved":
      return {
        actor: null,
        message: t("notifications:kinds.community_request_approved", { community: communityName(n) }),
        href: communityHref(n),
        icon: Check,
        context: community,
      };
    case "community_request_rejected":
      return {
        actor: null,
        message: t("notifications:kinds.community_request_rejected", { community: communityName(n) }),
        href: communityHref(n),
        icon: X,
        context: community,
      };
    default:
      return null;
  }
}
