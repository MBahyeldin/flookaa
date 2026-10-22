import { Sailboat } from "lucide-react";
import { Link } from "react-router-dom";

import { SidebarTrigger } from "@/components/ui/sidebar";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
      <SidebarTrigger size="icon" className="-ml-2 [&_svg]:size-[22px]" />
      <Link to="/" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Flookaa, home">
        <Sailboat aria-hidden="true" className="size-[22px] shrink-0 text-primary" />
        <span className="text-lg font-semibold text-foreground">Flookaa</span>
      </Link>
      <NotificationBell />
    </header>
  );
}
