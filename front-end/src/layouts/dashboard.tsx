import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React from "react";
import SelectPersonaPage from "@/pages/select-persona";
import { useLoading } from "@/Loading.context";
import AppLoader from "@/components/app-loader";
import { ToggleTheme } from "@/components/toggle-theme";
import VerifyEmailPage from "@/pages/verify-email";
import { useUserProfileStore } from "@/stores/UserProfileStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const { persona, user } = useUserProfileStore();
  const { isFetchCurrentPersonaLoading, isFetchAllPersonasLoading } = useLoading();

  if (isFetchCurrentPersonaLoading || isFetchAllPersonasLoading) {
    return <AppLoader />;
  }

  if (!user?.is_verified) {
    return <VerifyEmailPage />;
  }

  if (!persona) {
    return <SelectPersonaPage />;
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AppSidebar setOpen={setOpen} open={open} />
      <div className="w-full min-w-0">
        {/*
          Below 768px (useMobile MOBILE_BREAKPOINT) <Sidebar> renders as a Sheet
          that starts closed, so without a trigger the whole nav is unreachable.
          Sticky rather than fixed so it can't sit on top of page content.
        */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="size-11" />
          <span className="font-semibold">FlOOKAA</span>
        </header>
        <main className="w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Fixed top-right ToggleTheme */}
      <div className="fixed top-4 right-4 z-50">
        <ToggleTheme />
      </div>
    </SidebarProvider>
  );
}
