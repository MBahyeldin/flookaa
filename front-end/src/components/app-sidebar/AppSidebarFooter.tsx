import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { ChevronsUpDown, User2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuth } from "@/Auth.context";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Link } from "react-router-dom";
import clsx from "clsx";

export default function AppSidebarFooter({ open }: { open: boolean }) {
  const { user, handleLogOut } = useAuth();

  console.log("user in sidebar footer", user);

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <SidebarMenuButton className="flex items-center gap-3 px-2 py-1.5">
              <DropdownMenuTrigger asChild>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -ml-2 z-2 bg-sidebar">
                  {" "}
                  <Avatar className="w-8 h-8 cursor-pointer block">
                    <AvatarImage
                      src={""}
                      alt={user?.name || "User avatar"}
                      className="w-8 h-8 object-cover rounded-full"
                    />
                    <AvatarFallback className="flex items-center justify-center bg-muted rounded-full w-8 h-8">
                      <User2 className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <div className="flex-1 min-w-0 ml-8 text-left">
                <p className="truncate font-medium text-sm">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuTrigger asChild>
                <ChevronsUpDown
                  className={clsx(
                    "w-4 h-4 ml-2 text-muted-foreground shrink-0 cursor-pointer",
                    {
                      "absolute left-2 top-1/2 ": !open,
                    }
                  )}
                />
              </DropdownMenuTrigger>
            </SidebarMenuButton>

            <DropdownMenuContent
              side="right"
              className="w-[--radix-popper-anchor-width] min-w-[150px] mb-2 ml-1"
            >
              <DropdownMenuItem>
                <Link to="/settings/profile" className="w-full">
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogOut}>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
