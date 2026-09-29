import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";
import { useNotificationStore } from "@/stores/NotificationStore";
import formatDate, { formatRelativeDate } from "@/utils/formateDate";
import { describeNotification } from "./describe";

/**
 * One notification. Clicking marks it read and opens what it's about.
 * Kinds this build can't describe render nothing.
 */
export default function NotificationItem({
  notification,
  onOpen,
}: {
  notification: Notification;
  /** Called after navigating, e.g. to close the popover. */
  onOpen?: () => void;
}) {
  const navigate = useNavigate();
  const markRead = useNotificationStore((s) => s.markRead);
  const description = describeNotification(notification);
  if (!description) return null;

  const actor = notification.latest_actor;
  const image = actor?.thumbnail || notification.channel?.thumbnail || undefined;
  const initials = actor
    ? `${actor.first_name[0] ?? ""}${actor.last_name[0] ?? ""}`
    : (notification.channel?.name[0] ?? "?");

  const open = () => {
    markRead(notification);
    navigate(description.href);
    onOpen?.();
  };

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
        !notification.read && "bg-accent/40"
      )}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={image} alt="" />
        <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block break-words">
          {description.actor && <span className="font-semibold">{description.actor} </span>}
          {description.message}
        </span>
        <time
          dateTime={notification.updated_at}
          title={formatDate(notification.updated_at)}
          className="text-xs text-muted-foreground"
        >
          {formatRelativeDate(notification.updated_at)}
        </time>
      </span>
      {!notification.read && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </button>
  );
}
