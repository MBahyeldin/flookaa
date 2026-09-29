import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/NotificationStore";
import { describeNotification } from "./describe";
import NotificationItem from "./NotificationItem";

/** The bell with the unread badge; opens the latest notifications. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const recent = useNotificationStore((s) => s.recent);
  const refreshRecent = useNotificationStore((s) => s.refreshRecent);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refreshRecent();
  };

  const shown = recent?.filter((n) => describeNotification(n) !== null) ?? null;
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative cursor-pointer"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-white">
              {badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {shown === null ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            shown.map((n) => <NotificationItem key={n.id} notification={n} onOpen={() => setOpen(false)} />)
          )}
        </div>
        <Link
          to="/notifications"
          onClick={() => setOpen(false)}
          className="block border-t px-3 py-2 text-center text-sm font-medium hover:bg-accent"
        >
          See all
        </Link>
      </PopoverContent>
    </Popover>
  );
}
