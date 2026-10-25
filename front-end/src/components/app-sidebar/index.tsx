import { Bell, Compass, Hash, House, Sailboat, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/Auth.context";
import { useNotificationStore } from "@/stores/NotificationStore";

import AppSidebarFooter from "./AppSidebarFooter";
import SidebarNavItem, { type NavEntry } from "./SidebarNavItem";

export function AppSidebar() {
  const { user } = useAuth();
  const { canToggle } = useSidebar();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const entries: NavEntry[] = [
    { title: "Home", to: "/", icon: House },
    { title: "Discover", to: "/discover", icon: Compass },
    { title: "Channels", to: "/channels", icon: Hash },
    { title: "Communities", to: "/communities", icon: Users },
    { title: "Notifications", to: "/notifications", icon: Bell, badge: unreadCount },
    { title: "Personas", to: "/persona-manager", icon: UserRound },
    { title: "Settings", to: "/settings/profile", icon: Settings, match: "/settings" },
  ];
  if (user?.is_admin) {
    entries.push({ title: "Admin", to: "/admin/interests", icon: ShieldCheck, match: "/admin" });
  }

  return (
    <Sidebar>
      <div className="flex w-full items-center justify-between pb-4 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:pb-1">
        <Link
          to="/"
          aria-label="Flookaa, home"
          className="flex items-center gap-2.5 rounded-md pl-3 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:pb-3 group-data-[collapsible=icon]:pl-0"
        >
          <Sailboat aria-hidden="true" className="size-6 text-primary" />
          <span className="text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            Flookaa
          </span>
        </Link>
        {canToggle && <SidebarTrigger />}
      </div>
      <SidebarContent>
        <nav aria-label="Main" className="w-full">
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
