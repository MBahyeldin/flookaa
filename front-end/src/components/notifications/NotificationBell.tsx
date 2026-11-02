import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/stores/NotificationStore";
import NotificationPopover from "./NotificationPopover";
import { useTranslation } from "react-i18next";

/** The mobile header's bell with the unread badge; opens the latest notifications. */
export default function NotificationBell() {
  const { t } = useTranslation(["common", "notifications"]);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const badge = unreadCount > 99 ? t("shell.badgeMax") : String(unreadCount);

  return (
    <NotificationPopover>
      <Button
        variant="ghost"
        className="h-9 gap-1 px-2 -mr-2"
        aria-label={unreadCount > 0 ? t("notifications:bellUnread", { count: unreadCount }) : t("nav.notifications")}
      >
        <Bell aria-hidden="true" className="size-[22px]" />
        {unreadCount > 0 && <Badge variant="count">{badge}</Badge>}
      </Button>
    </NotificationPopover>
  );
}
