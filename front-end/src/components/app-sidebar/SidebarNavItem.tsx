import { useState, type ReactElement } from "react";
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
  // Desktop and tablet: the entry opens this instead of navigating.
  popover?: (button: ReactElement, onOpenChange: (open: boolean) => void) => ReactElement;
};

function isActive(pathname: string, prefix: string) {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export default function SidebarNavItem({ title, to, icon: Icon, match, badge, popover }: NavEntry) {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const active = isActive(pathname, match ?? to);

  const content = (
    <>
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
    </>
  );

  if (popover && !isMobile) {
    return (
      <SidebarMenuItem>
        {popover(
          <SidebarMenuButton isActive={active || open} tooltip={title}>
            {content}
          </SidebarMenuButton>,
          setOpen,
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={title}>
        <Link
          to={to}
          aria-current={active ? "page" : undefined}
          onClick={() => isMobile && setOpenMobile(false)}
        >
          {content}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
