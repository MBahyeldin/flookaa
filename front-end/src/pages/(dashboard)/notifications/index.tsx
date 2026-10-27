import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import NotificationItem from "@/components/notifications/NotificationItem";
import { describeNotification } from "@/components/notifications/describe";
import { dateGroup, type DateGroup } from "@/components/notifications/time";
import { getNotifications } from "@/services/notifications";
import { useNotificationStore } from "@/stores/NotificationStore";
import type { Notification } from "@/types/notification";

/** Pages fetched per "Load more"; a page can come back short or empty. */
const PAGE_SIZE = 20;
/** Empty pages to skip through before giving the button back to the user. */
const MAX_EMPTY_PAGES = 5;

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const version = useNotificationStore((s) => s.version);
  // Ignore responses of a load that a reload has replaced.
  const generation = useRef(0);

  /**
   * Loads from `from` (null = the top). Rows the server drops (nobody left
   * behind them) can make a page short or empty, so keep going until
   * something renderable arrives or the list ends.
   */
  const load = useCallback(async (from: string | null, replace: boolean) => {
    const gen = replace ? ++generation.current : generation.current;
    setLoading(true);
    setFailed(false);
    let next = from;
    const collected: Notification[] = [];
    let more = true;
    for (let empty = 0; empty < MAX_EMPTY_PAGES; empty++) {
      const page = await getNotifications(next, PAGE_SIZE);
      if (gen !== generation.current) return;
      if (!page && collected.length === 0) {
        // Nothing new: keep what's shown, and say so.
        if (replace) setFailed(true);
        else toast.error("Couldn't load more notifications");
        setLoading(false);
        return;
      }
      if (!page) break;
      collected.push(...page.notifications);
      next = page.next_cursor;
      more = next !== null;
      if (!more || page.notifications.some((n) => describeNotification(n) !== null)) break;
    }
    setItems((prev) => (replace ? collected : [...prev, ...collected]));
    setCursor(next);
    setHasMore(more);
    setLoading(false);
  }, []);

  // First load, and a reload from the top whenever a notification arrives,
  // disappears, or everything was marked read.
  useEffect(() => {
    load(null, true);
  }, [load, version]);

  const shown = items.filter((n) => describeNotification(n) !== null);
  const groups = new Map<DateGroup, Notification[]>();
  for (const n of shown) {
    const group = dateGroup(n.updated_at);
    groups.set(group, [...(groups.get(group) ?? []), n]);
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-6 md:py-12">
      <div className="mb-6 flex items-center gap-3 md:mb-8">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <>
            <Badge variant="count">{unreadCount > 99 ? "99+" : unreadCount}</Badge>
            <Button variant="outline" size="sm" onClick={markAllRead} className="ml-auto">
              Mark all read
            </Button>
          </>
        )}
      </div>
      {shown.length === 0 && loading ? (
        <SkeletonList count={5} className="px-3" />
      ) : shown.length === 0 && failed ? (
        <ErrorState title="Couldn't load notifications" onRetry={() => load(null, true)} />
      ) : shown.length === 0 && !hasMore ? (
        <EmptyState icon={Bell} title="You're all caught up" body="Follows, requests and replies show up here." />
      ) : (
        <div className="space-y-6 md:space-y-8">
          {[...groups].map(([group, rows]) => (
            <section key={group} aria-label={group} className="space-y-2">
              <h2 className="text-overline font-semibold text-muted-foreground uppercase">{group}</h2>
              <div className="rounded-lg border bg-card p-1">
                {rows.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onOpen={() => setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)))}
                  />
                ))}
              </div>
            </section>
          ))}
          {loading && (
            <p role="status" className="py-2 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}
        </div>
      )}
      {hasMore && !loading && shown.length > 0 && (
        <div className="mt-6 flex justify-center md:mt-8">
          <Button variant="outline" onClick={() => load(cursor, false)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
