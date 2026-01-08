import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../ui/sidebar";
import { ChevronDown } from "lucide-react";
import React, { useEffect, type JSX } from "react";
import { Link } from "react-router-dom";

export default function CollapsibleItem({
  item,
  setSidebarOpen,
  sidebarOpen,
}: {
  item: {
    title: string;
    url: string;
    icon: React.ElementType;
    items?: { title: string; url: string, icon: JSX.Element }[];
  };
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const hasSubItems = item.items && item.items.length > 0;
  const [isOpenItem, setIsOpenItem] = React.useState(false);

  const handleItemClick = React.useCallback(
    (e: React.MouseEvent) => {
      setSidebarOpen(true);
      setIsOpenItem(true);
      if (sidebarOpen) {
        return;
      }
      e.preventDefault();
    },
    [setSidebarOpen, sidebarOpen]
  );

  useEffect(() => {
    if (!sidebarOpen) {
      setIsOpenItem(false);
    }
  }, [sidebarOpen]);

  return (
    <Collapsible
      defaultOpen
      className="group/collapsible"
      key={item.title}
      disabled={!hasSubItems}
      open={isOpenItem}
      onOpenChange={setIsOpenItem}
    >
      <SidebarMenuItem key={item.title}>
        {hasSubItems ? (
          <>
            <CollapsibleTrigger asChild onClick={handleItemClick}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <div className="flex items-center w-full cursor-pointer">
                  <item.icon />
                  <span>{item.title}</span>
                  {hasSubItems && (
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  )}
                </div>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild>
                      <Link to={item.url + subItem.url} className="h-8"><div className="flex flex-row px-2 py-1 align-center items-center gap-2">{subItem.icon} {subItem.title}</div></Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : (
          <SidebarMenuButton asChild tooltip={item.title}>
            <Link to={item.url} className="flex items-center w-full">
              <item.icon />
              <span>{item.title}</span>
              {hasSubItems && (
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              )}
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
