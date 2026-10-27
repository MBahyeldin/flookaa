import { useNavigate } from "react-router-dom";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";
import { useNotificationStore } from "@/stores/NotificationStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import formatDate from "@/utils/formateDate";
import { describeNotification } from "./describe";
import { shortTime } from "./time";

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
  const personaId = useUserProfileStore((s) => s.persona?.id);
  const viewerId = personaId ? Number(personaId) : undefined;
  const description = describeNotification(notification, viewerId);
  if (!description) return null;

  const actor = notification.latest_actor;
  const actorName = actor ? `${actor.first_name} ${actor.last_name}`.trim() : "";
  const entity = notification.community ?? notification.channel;
  const KindIcon = description.icon;

  const open = () => {
    markRead(notification);
    navigate(description.href);
    onOpen?.();
  };

  const mark = actor ? (
    <Avatar size="md">
      {actor.anonymous ? (
        <GeneratedAvatarFallback name={actor.first_name} />
      ) : (
        <>
          <AvatarImage src={actor.thumbnail || undefined} alt="" />
          <AvatarFallback>{`${actor.first_name[0] ?? ""}${actor.last_name[0] ?? ""}`.toUpperCase()}</AvatarFallback>
        </>
      )}
    </Avatar>
  ) : (
    <Logo size="sm" name={entity?.name ?? "?"} src={entity?.thumbnail || null} className="m-1" />
  );

  const lead = (
    <span className="relative block size-10 shrink-0">
      {mark}
      <span
        aria-hidden="true"
        className="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
      >
        <KindIcon className="size-[11px]" strokeWidth={2.5} />
      </span>
    </span>
  );

  // The avatar opens the actor's card, so it sits beside the open button, not inside it.
  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-md p-3 text-sm transition-colors hover:bg-accent focus-within:bg-accent",
        !notification.read && "bg-accent/40",
      )}
    >
      {actor ? (
        <PersonaLink
          personaId={actor.id}
          anonymous={actor.anonymous}
          name={actorName}
          thumbnail={actor.thumbnail || undefined}
          className="shrink-0 rounded-full"
        >
          {lead}
        </PersonaLink>
      ) : (
        lead
      )}
      <button
        type="button"
        onClick={open}
        className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block break-words">
            {description.actor && <span className="font-semibold">{description.actor} </span>}
            {description.message}
          </span>
          <span className="block text-xs text-muted-foreground">
            <time dateTime={notification.updated_at} title={formatDate(notification.updated_at)}>
              {shortTime(notification.updated_at)}
            </time>
            {description.context && ` · ${description.context}`}
          </span>
        </span>
        {!notification.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </button>
    </div>
  );
}
