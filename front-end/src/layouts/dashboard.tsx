import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React from "react";
import { useAuth } from "@/Auth.context";
import SelectPersonaPage from "@/pages/select-persona";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const { isPersonaSelected } = useAuth();


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
