import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export type NavEntry = {
  title: string;
  to: string;
  icon: LucideIcon;
  // Path prefix that lights the entry; `to` when omitted.
  match?: string;
  badge?: number;
};

function isActive(pathname: string, prefix: string) {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export default function SidebarNavItem({ title, to, icon: Icon, match, badge }: NavEntry) {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const active = isActive(pathname, match ?? to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={title}>
        <Link
          to={to}
          aria-current={active ? "page" : undefined}
          onClick={() => isMobile && setOpenMobile(false)}
        >
          <Icon aria-hidden="true" />
          <span>
            {title}
            {!!badge && <span className="sr-only">, {badge} unread</span>}
          </span>
          {!!badge && (
            <Badge
              variant="count"
              aria-hidden="true"
              className="group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1"
            >
              {badge > 99 ? "99+" : badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
