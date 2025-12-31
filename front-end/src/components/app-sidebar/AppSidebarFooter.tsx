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
import clsx from "clsx";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { setCurrentPersona } from "@/services/persona";

export default function AppSidebarFooter({ open }: { open: boolean }) {
  const { user, persona, handleLogOut } = useAuth();
  const { personas } = useUserProfileStore();


  console.log("user in sidebar footer", user, persona);

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
                      src={persona?.thumbnail}
                      alt={persona?.name}
                      className="w-8 h-8 object-cover rounded-full"
                    />
                    <AvatarFallback className="flex items-center justify-center bg-muted rounded-full w-8 h-8">
                      <User2 className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <div className="flex-1 min-w-0 ml-8 text-left">
                <p className="truncate font-medium text-sm">{persona?.first_name} {persona?.last_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {persona?.name}
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
                {
                  personas.filter(p => p.id !== persona?.id).map((p) => (
                    <DropdownMenuItem  onClick={async () => {
                          await setCurrentPersona(p.id);
                          window.location.reload();
                        }}
                        className="cursor-pointer"  
                      >
                      <div
                        key={p.id}
                        className="cursor-pointer flex items-center gap-2 flex-row"
                      >
                        <Avatar className="w-8 h-8 cursor-pointer block">
                          <AvatarImage
                            src={p?.thumbnail}
                            alt={p?.name}
                            className="w-8 h-8 object-cover rounded-full"
                          />
                          <AvatarFallback className="flex items-center justify-center bg-muted rounded-full w-8 h-8">
                            <User2 className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        {p.first_name} {p.last_name} ({p.name})
                      </div>
                    </DropdownMenuItem>
                  ))
                }
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
