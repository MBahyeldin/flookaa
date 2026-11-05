import { useAuth } from "@/Auth.context";
import VisitorPage from "./visitor";
import FeedPage from "../(dashboard)/feed";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <VisitorPage />;
  }

  return <FeedPage />;
}
