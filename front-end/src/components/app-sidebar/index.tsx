import { Bell, Bookmark, Compass, Hash, House, Sailboat, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/Auth.context";
import NotificationPopover from "@/components/notifications/NotificationPopover";
import { useNotificationStore } from "@/stores/NotificationStore";
import { direction } from "@/i18n";

import AppSidebarFooter from "./AppSidebarFooter";
import SidebarNavItem, { type NavEntry } from "./SidebarNavItem";

export function AppSidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { canToggle } = useSidebar();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const entries: NavEntry[] = [
    { title: t("nav.home"), to: "/", icon: House },
    { title: t("nav.discover"), to: "/discover", icon: Compass },
    { title: t("nav.saved"), to: "/saved", icon: Bookmark },
    { title: t("nav.channels"), to: "/channels", icon: Hash },
    { title: t("nav.communities"), to: "/communities", icon: Users },
    {
      title: t("nav.notifications"),
      to: "/notifications",
      icon: Bell,
      badge: unreadCount,
      popover: (button, onOpenChange) => (
        <NotificationPopover side={direction() === "rtl" ? "left" : "right"} align="start" onOpenChange={onOpenChange}>
          {button}
        </NotificationPopover>
      ),
    },
    { title: t("nav.personas"), to: "/persona-manager", icon: UserRound },
    { title: t("nav.settings"), to: "/settings/profile", icon: Settings, match: "/settings" },
  ];
  if (user?.is_admin) {
    entries.push({ title: t("nav.admin"), to: "/admin/interests", icon: ShieldCheck, match: "/admin" });
  }

  return (
    <Sidebar>
      <div className="flex w-full items-center justify-between pb-4 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:pb-1">
        <Link
          to="/"
          aria-label={t("shell.homeLink")}
          className="flex items-center gap-2.5 rounded-md ps-3 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:pb-3 group-data-[collapsible=icon]:ps-0"
        >
          <Sailboat aria-hidden="true" className="size-6 text-primary" />
          <span className="text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            Flookaa
          </span>
        </Link>
        {canToggle && <SidebarTrigger />}
      </div>
      <SidebarContent>
        <nav aria-label={t("shell.mainNav")} className="w-full">
          <SidebarMenu>
            {entries.map((entry) => (
              <SidebarNavItem key={entry.to} {...entry} />
            ))}
          </SidebarMenu>
        </nav>
      </SidebarContent>
      <AppSidebarFooter />
    </Sidebar>
  );
}
