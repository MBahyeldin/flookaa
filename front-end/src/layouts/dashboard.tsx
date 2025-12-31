import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React, { useEffect } from "react";
import { useAuth } from "@/Auth.context";
import SelectPersonaPage from "@/pages/select-persona";
import { fetchUserPersonas } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useLoading } from "@/Loading.context";
import AppLoader from "@/components/app-loader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const { setPersonas } = useUserProfileStore();

  const { isPersonaSelected } = useAuth();
  const { isFetchCurrentPersonaLoading, isFetchAllPersonasLoading, setIsFetchAllPersonasLoading } = useLoading();

  useEffect(() => {
    const fetchPersonas = async () => {
      try{
        const personas = await fetchUserPersonas();
        setPersonas(personas);
      } catch (error) {
        setPersonas([]);
      } finally {
        setIsFetchAllPersonasLoading(false);
      }
    };

    fetchPersonas();
  }, [setPersonas]);

  if (isFetchCurrentPersonaLoading || isFetchAllPersonasLoading) {
    return <AppLoader />;
  }

  if (!isPersonaSelected) {
    return <SelectPersonaPage />;
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AppSidebar setOpen={setOpen} open={open} />
      <main className="w-full bg-gray-50">
        {children}
      </main>
    </SidebarProvider>
  );
}
