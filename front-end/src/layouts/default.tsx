import { useLocation } from "react-router-dom";
import Header from "@/navbar/header";
import Footer from "@/navbar/footer";

const AUTH_ROUTES = ["/login", "/sign-up"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAuth = AUTH_ROUTES.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onlyLogo={isAuth} />
      <main className="flex flex-1 flex-col">{children}</main>
      {!isAuth && <Footer />}
    </div>
  );
}
