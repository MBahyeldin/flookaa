import type { Notification } from "@/types/notification";

export type NotificationDescription = {
  /** Shown in bold before the message; null when there's no actor. */
  actor: string | null;
  message: string;
  href: string;
};

function actorName(n: Notification): string | null {
  if (!n.latest_actor) return null;
  return `${n.latest_actor.first_name} ${n.latest_actor.last_name}`.trim();
}

/** "Bob", "Bob and 1 other", "Bob and 4 others". */
function actors(n: Notification): string {
  const name = actorName(n) ?? "Someone";
  const others = n.count - 1;
  if (others <= 0) return name;
  return `${name} and ${others} ${others === 1 ? "other" : "others"}`;
}

function inChannel(n: Notification): string {
  return n.channel ? ` in ${n.channel.name}` : "";
}

function channelName(n: Notification): string {
  return n.channel?.name ?? "a channel";
}

function communityName(n: Notification): string {
  return n.community?.name ?? "a community";
}

function communityHref(n: Notification, query = ""): string {
  return n.community ? `/communities/${n.community.slug}${query}` : "/communities";
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
export function describeNotification(n: Notification): NotificationDescription | null {
  switch (n.kind) {
    case "post_like":
      return { actor: actors(n), message: `liked your post${inChannel(n)}`, href: contentHref(n) };
    case "comment_like":
      return { actor: actors(n), message: `liked your comment${inChannel(n)}`, href: contentHref(n) };
    case "post_comment":
      return { actor: actors(n), message: `commented on your post${inChannel(n)}`, href: contentHref(n) };
    case "comment_reply":
      return { actor: actors(n), message: `replied to your comment${inChannel(n)}`, href: contentHref(n) };
    case "join_request":
      return {
        actor: actors(n),
        message: `asked to join ${channelName(n)}`,
        href: `/channels/${n.subject.id}`,
      };
    case "request_approved":
      return {
        actor: null,
        message: `Your request to join ${channelName(n)} was approved`,
        href: `/channels/${n.subject.id}`,
      };
    case "removed_from_channel":
      return {
        actor: null,
        message: `You were removed from ${channelName(n)}`,
        href: `/channels/${n.subject.id}`,
      };
    case "new_follower":
      return { actor: actors(n), message: "followed you", href: `/personas/${n.subject.id}` };
    case "follow_request":
      return {
        actor: actors(n),
        message: "asked to follow you",
        href: `/personas/${n.subject.id}?followers=requests`,
      };
    case "follow_request_approved":
      return {
        actor: actorName(n) ?? "Someone",
        message: "accepted your follow request",
        href: `/personas/${n.subject.id}`,
      };
    case "follow_invitation":
      return {
        actor: actorName(n) ?? "Someone",
        message: "invited you to follow them",
        href: `/personas/${n.subject.id}`,
      };
    case "follow_invitation_accepted":
      return {
        actor: actorName(n) ?? "Someone",
        message: "accepted your invitation and follows you",
        href: `/personas/${n.subject.id}`,
      };
    case "channel_request":
      return {
        actor: actors(n),
        message: `suggested ${n.count === 1 ? "a channel" : "channels"} for ${communityName(n)}`,
        href: communityHref(n, "?members=channels"),
      };
    case "channel_request_approved":
      return {
        actor: null,
        message: `${channelName(n)} was added to ${communityName(n)}`,
        href: communityHref(n),
      };
    case "channel_request_rejected":
      return {
        actor: null,
        message: `${communityName(n)} declined ${channelName(n)}`,
        href: n.channel ? `/channels/${n.channel.id}` : communityHref(n),
      };
    case "community_join_request":
      return {
        actor: actors(n),
        message: `asked to join ${communityName(n)}`,
        href: communityHref(n, "?members=requests"),
      };
    case "community_request_approved":
      return {
        actor: null,
        message: `Your request to join ${communityName(n)} was approved`,
        href: communityHref(n),
      };
    case "community_request_rejected":
      return {
        actor: null,
        message: `Your request to join ${communityName(n)} was declined`,
        href: communityHref(n),
      };
    default:
      return null;
  }
}
