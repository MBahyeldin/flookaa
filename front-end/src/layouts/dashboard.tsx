import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import MobileHeader from "@/components/mobile-header";
import React from "react";
import SelectPersonaPage from "@/pages/select-persona";
import { useLoading } from "@/Loading.context";
import AppLoader from "@/components/app-loader";
import VerifyEmailPage from "@/pages/verify-email";
import OnboardingPage from "@/pages/onboarding";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import useNotificationsRealtime from "@/hooks/useNotificationsRealtime";
import usePersonaTheme from "@/hooks/usePersonaTheme";
import useResumeAuthNext from "@/hooks/useResumeAuthNext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { persona, user } = useUserProfileStore();
  const { isFetchCurrentPersonaLoading, isFetchAllPersonasLoading } = useLoading();
  // Before the early returns: hooks must run on every render.
  useNotificationsRealtime(user?.is_verified ? persona?.id : undefined);
  usePersonaTheme(persona?.theme);
  useResumeAuthNext();

  if (isFetchCurrentPersonaLoading || isFetchAllPersonasLoading) {
    return <AppLoader />;
  }

  if (!user?.is_verified) {
    return <VerifyEmailPage />;
  }

  if (user.onboarding && !user.onboarding.completed) {
    return <OnboardingPage />;
  }

  if (!persona) {
    return <SelectPersonaPage />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="w-full min-w-0">
        <MobileHeader />
        <main className="w-full min-w-0">{children}</main>
      </div>
    </SidebarProvider>
  );
}
