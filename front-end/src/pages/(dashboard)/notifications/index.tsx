import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NotificationItem from "@/components/notifications/NotificationItem";
import { describeNotification } from "@/components/notifications/describe";
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
    let next = from;
    const collected: Notification[] = [];
    let more = true;
    for (let empty = 0; empty < MAX_EMPTY_PAGES; empty++) {
      const page = await getNotifications(next, PAGE_SIZE);
      if (gen !== generation.current) return;
      if (!page) {
        // Request failed: keep the button so the user can retry.
        more = true;
        break;
      }
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-1">
          {shown.length === 0 && !loading && !hasMore ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            shown.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={() =>
                  setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)))
                }
              />
            ))
          )}
          {loading && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Loading…</p>}
        </CardContent>
      </Card>
      {hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => load(cursor, false)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
