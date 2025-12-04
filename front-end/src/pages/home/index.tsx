import { useAuth } from "@/Auth.context";
import VisitorPage from "./visitor";
import UnverifiedPage from "./unverified";
import DashboardPage from "../(dashboard)";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <VisitorPage />;
  }

  if (!user?.is_verified) {
    return <UnverifiedPage />;
  }

  return <DashboardPage />;
}
