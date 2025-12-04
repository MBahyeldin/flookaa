import { Calendar, Home, Inbox, Rss, Search, Settings } from "lucide-react";

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
    title: "Channels",
    url: "/channels",
    icon: Rss,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    items: [
      { title: "Profile", url: "/profile" },
      { title: "Billing", url: "/billing" },
    ],
  },
  {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
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
      return items.map((item) => {
        if (item.title === "My Channels") {
          return {
            ...item,
            items: user.joined_channels.map((channel) => ({
              title: channel.name,
              url: `/${channel.id}`,
            })),
          };
        }
        return item;
      });
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
              <SidebarMenuButton className="flex items-center space-x-2 border-b border-gray-200 no-draggable justify-between">
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
