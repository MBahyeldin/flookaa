import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React from "react";
import { useAuth } from "@/Auth.context";
import SelectPersonaPage from "@/pages/select-persona";
import { useLoading } from "@/Loading.context";
import AppLoader from "@/components/app-loader";
import { ToggleTheme } from "@/components/toggle-theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const { isPersonaSelected } = useAuth();
  const { isFetchCurrentPersonaLoading, isFetchAllPersonasLoading } = useLoading();

  if (isFetchCurrentPersonaLoading || isFetchAllPersonasLoading) {
    return <AppLoader />;
  }

  if (!isPersonaSelected) {
    return <SelectPersonaPage />;
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AppSidebar setOpen={setOpen} open={open} />
      <main className="w-full">
        {children}
      </main>

      {/* Fixed top-right ToggleTheme */}
      <div className="fixed top-4 right-4 z-50">
        <ToggleTheme />
      </div>
    </SidebarProvider>
  );
}
