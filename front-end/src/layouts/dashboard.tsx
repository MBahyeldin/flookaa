import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React from "react";
import { useAuth } from "@/Auth.context";
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
