import { useLocation } from "react-router-dom";
import Header from "@/navbar/header";
import Footer from "@/navbar/footer";

// These pages bring their own brand (AuthSplit).
const AUTH_ROUTES = ["/login", "/sign-up", "/forgot-password", "/reset-password"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAuth = AUTH_ROUTES.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!isAuth && <Header />}
      <main className="flex flex-1 flex-col">{children}</main>
      {!isAuth && <Footer />}
    </div>
  );
}
