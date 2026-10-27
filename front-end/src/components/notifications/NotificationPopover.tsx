import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useNotificationStore } from "@/stores/NotificationStore";
import { describeNotification } from "./describe";
import NotificationItem from "./NotificationItem";

/** The latest notifications, opened from `children` (the bell or the sidebar entry). */
export default function NotificationPopover({
  children,
  side = "bottom",
  align = "end",
  onOpenChange,
}: {
  children: ReactNode;
  side?: "bottom" | "right";
  align?: "start" | "end";
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const recent = useNotificationStore((s) => s.recent);
  const recentFailed = useNotificationStore((s) => s.recentFailed);
  const refreshRecent = useNotificationStore((s) => s.refreshRecent);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const change = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) refreshRecent();
  };

  const shown = recent?.filter((n) => describeNotification(n) !== null) ?? null;

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        side={side}
        align={align}
        sideOffset={8}
        tabIndex={-1}
        // Focus the panel, not "Mark all read", so a stray Enter doesn't mark everything.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          contentRef.current?.focus();
        }}
        className="w-[min(24rem,calc(100vw-2rem))] p-0 focus-visible:outline-none"
      >
        <div className="flex min-h-12 items-center justify-between border-b py-2 pr-3 pl-4">
          <span className="font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {shown === null && recentFailed ? (
            <ErrorState compact title="Couldn't load notifications" onRetry={refreshRecent} />
          ) : shown === null ? (
            <SkeletonList count={3} className="px-2" />
          ) : shown.length === 0 ? (
            <EmptyState compact icon={Bell} title="No notifications yet" body="Follows, requests and replies show up here." />
          ) : (
            shown.map((n) => <NotificationItem key={n.id} notification={n} onOpen={() => change(false)} />)
          )}
        </div>
        <Link
          to="/notifications"
          onClick={() => change(false)}
          className="block border-t py-2.5 text-center text-sm font-medium hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          See all notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}
