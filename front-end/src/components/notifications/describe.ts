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

/**
 * Where a content notification leads: the post itself when data.post_id is
 * known (rows written before it existed lack it), else its channel.
 */
function contentHref(n: Notification): string {
  const channel = `/channels/${n.scope?.id ?? n.channel?.id ?? ""}`;
  const postId = n.data?.post_id;
  if (!postId) return channel;
  const params = new URLSearchParams({ post: postId });
  if (n.subject.type === "COMMENT") params.set("comment", n.subject.id);
  return `${channel}?${params}`;
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
    default:
      return null;
  }
}
