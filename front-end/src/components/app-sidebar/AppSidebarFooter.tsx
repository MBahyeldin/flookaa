import { Check, ChevronDown, LogOut, Settings, SunMoon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/Auth.context";
import { useTheme } from "@/Theme.context";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { setCurrentPersona } from "@/services/persona";
import type { Persona } from "@/types/persona";
import { personaInitials as initials } from "@/lib/personaInitials";
import { cn } from "@/lib/utils";

function PersonaAvatar({ persona }: { persona: Persona }) {
  return (
    <Avatar size="sm">
      <AvatarImage src={persona.thumbnail} className="object-cover" />
      <AvatarFallback>{initials(persona)}</AvatarFallback>
    </Avatar>
  );
}

export default function AppSidebarFooter() {
  const { handleLogOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { persona, personas } = useUserProfileStore();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  if (!persona) return null;
  const displayName = `${persona.first_name} ${persona.last_name}`;

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Appearance" aria-pressed={isDarkMode} onClick={toggleTheme}>
            <SunMoon aria-hidden="true" />
            <span>Appearance</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${displayName}, switch persona or log out`}
            className="flex w-full items-center gap-2.5 rounded-md border border-sidebar-border p-2 text-left outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0"
          >
            <PersonaAvatar persona={persona} />
            <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">@{persona.slug}</span>
            </span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={collapsed && !isMobile ? "right" : "top"}
          align={collapsed && !isMobile ? "end" : "start"}
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        >
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Switch persona</DropdownMenuLabel>
          {personas.map((p) => {
            const current = p.id === persona.id;
            return (
              <DropdownMenuItem
                key={p.id}
                aria-current={current || undefined}
                className={cn("h-auto py-1.5", current && "bg-accent")}
                onClick={async () => {
                  if (current) return;
                  if (await setCurrentPersona(p.id)) window.location.reload();
                  else toast.error("Couldn't switch persona. Please try again.");
                }}
              >
                <PersonaAvatar persona={p} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{p.first_name} {p.last_name}</span>
                  <span className="truncate text-xs text-muted-foreground">@{p.slug}</span>
                </span>
                {current && <Check aria-hidden className="text-primary" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/persona-manager" onClick={() => isMobile && setOpenMobile(false)}>
              <Settings aria-hidden />
              Manage personas
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogOut}>
            <LogOut aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  );
}
