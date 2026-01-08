import { Home, Inbox, Rss, Search, Settings, ScanFace, User2 } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

import CollapsibleItem from "./CollapsibleItem";
import AppSidebarFooter from "./AppSidebarFooter";
import MainMenuItem from "./MainMenuItem";
import { useAuth } from "@/Auth.context";
import React from "react";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
    {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
  },
  {
    title: "Channels",
    url: "/channels",
    icon: Rss,
  },
    {
    title: "Search",
    url: "/search",
    icon: Search,
  },
  {
    title: "Persona",
    url: "/persona-manager",
    icon: ScanFace,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    items: [
      { title: "Profile", url: "/profile", icon:  <User2 className="w-5 h-5" /> },
    ],
  },
];

export function AppSidebar({
  setOpen,
  open,
}: {
  setOpen: (open: boolean) => void;
  open: boolean;
}) {
  const { user } = useAuth();
  const sidebarItems = React.useMemo(() => {
    if (user?.is_verified) {
      return items;
    }
    return [
      {
        title: "Home",
        url: "/",
        icon: Home,
      },
    ];
  }, [user]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuButton className="flex items-center space-x-2 border-b border-muted no-draggable justify-between">
                <MainMenuItem setOpen={setOpen} open={open} />
              </SidebarMenuButton>
              {sidebarItems.map((item) => {
                return (
                  <CollapsibleItem
                    key={item.title}
                    item={item}
                    setSidebarOpen={setOpen}
                    sidebarOpen={open}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <AppSidebarFooter open={open} />
    </Sidebar>
  );
}
