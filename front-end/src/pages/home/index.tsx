import { useAuth } from "@/Auth.context";
import VisitorPage from "./visitor";
import DashboardPage from "../(dashboard)";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <VisitorPage />;
  }

  return <DashboardPage />;
}
