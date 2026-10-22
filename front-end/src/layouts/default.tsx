import { useLocation } from "react-router-dom";
import Header from "@/navbar/header";

const AUTH_ROUTES = ["/login", "/sign-up"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <Header onlyLogo={AUTH_ROUTES.includes(pathname)} />
      <main>{children}</main>
    </div>
  );
}
