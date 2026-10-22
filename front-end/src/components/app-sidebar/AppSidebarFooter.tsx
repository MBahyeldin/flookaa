import { ChevronDown, SunMoon } from "lucide-react";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/Auth.context";
import { useTheme } from "@/Theme.context";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { setCurrentPersona } from "@/services/persona";
import type { Persona } from "@/types/persona";

function initials(p: Persona) {
  return `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase();
}

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
  const { state, isMobile } = useSidebar();
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
          {personas
            .filter((p) => p.id !== persona.id)
            .map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={async () => {
                  await setCurrentPersona(p.id);
                  window.location.reload();
                }}
              >
                <PersonaAvatar persona={p} />
                <span className="min-w-0 truncate">
                  {p.first_name} {p.last_name}{" "}
                  <span className="text-muted-foreground">({p.name})</span>
                </span>
              </DropdownMenuItem>
            ))}
          {personas.length > 1 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={handleLogOut}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  );
}
