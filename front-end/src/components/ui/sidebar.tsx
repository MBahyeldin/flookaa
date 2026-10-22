import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeftIcon } from "lucide-react";

import { useBreakpoint } from "@/hooks/useMobile";
import { useSidebarSwipe } from "@/hooks/useSidebarSwipe";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_STORAGE_KEY = "sidebar_expanded";
const SIDEBAR_WIDTH = "15.5rem";
const SIDEBAR_WIDTH_ICON = "4rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  isMobile: boolean;
  canToggle: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function readExpanded() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function SidebarProvider({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const canToggle = breakpoint === "desktop";
  const [openMobile, setOpenMobile] = React.useState(false);
  const [expanded, setExpanded] = React.useState(readExpanded);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((open) => !open);
      return;
    }
    if (!canToggle) return;
    setExpanded((open) => {
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!open));
      } catch {
        // Private mode: the choice just isn't remembered.
      }
      return !open;
    });
  }, [isMobile, canToggle]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // The mobile sheet always shows the expanded sidebar; tablet is always the rail.
  const state = isMobile || (canToggle && expanded) ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({ state, isMobile, canToggle, openMobile, setOpenMobile, toggleSidebar }),
    [state, isMobile, canToggle, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  const swipe = useSidebarSwipe({
    enabled: isMobile,
    side: "left",
    open: openMobile,
    setOpen: setOpenMobile,
  });

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          ref={swipe.contentRef}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-(--sidebar-solid) text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              ...(swipe.suppressAnimation && { animation: "none" }),
            } as React.CSSProperties
          }
          side="left"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Main navigation.</SheetDescription>
          </SheetHeader>
          <div className={cn("flex h-full w-full flex-col px-3 py-4", className)}>
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? "icon" : ""}
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-gap"
        className="relative w-(--sidebar-width) transition-[width] duration-200 ease-linear group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
      />
      <div
        data-slot="sidebar-container"
        className="fixed inset-y-0 left-0 z-10 hidden h-svh w-(--sidebar-width) border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-linear md:flex group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className={cn(
            "flex h-full w-full flex-col px-3 py-4 group-data-[collapsible=icon]:items-center",
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, isMobile, state } = useSidebar();
  const label = isMobile
    ? "Open menu"
    : state === "expanded"
      ? "Collapse sidebar"
      : "Expand sidebar";

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-expanded={isMobile ? undefined : state === "expanded"}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
    </Button>
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col gap-1 overflow-auto group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:overflow-visible",
        className
      )}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn(
        "flex w-full flex-col gap-2 group-data-[collapsible=icon]:items-center",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn(
        "flex w-full min-w-0 flex-col gap-1 group-data-[collapsible=icon]:items-center",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("relative w-full group-data-[collapsible=icon]:w-auto", className)}
      {...props}
    />
  );
}

// max-md: the sheet's rows stay at the 44px touch-target minimum.
const sidebarMenuButtonClass =
  "relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-muted-foreground outline-hidden transition-colors max-md:h-11 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent [&>svg]:size-5 [&>svg]:shrink-0 [&>span:first-of-type]:min-w-0 [&>span:first-of-type]:flex-1 [&>span:first-of-type]:truncate group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:[&>span:first-of-type]:sr-only";

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}) {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-active={isActive}
      className={cn(sidebarMenuButtonClass, className)}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
