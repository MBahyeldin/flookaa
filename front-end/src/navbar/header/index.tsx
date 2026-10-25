import { Link } from "react-router-dom";
import { SunMoon } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/Theme.context";

export default function Header({ onlyLogo = false }: { onlyLogo?: boolean }) {
  const { toggleTheme } = useTheme();

  return (
    <header className="flex w-full items-center gap-2 px-4 py-4 sm:gap-4 md:px-6 lg:px-20">
      <Brand className="flex-1" />
      {!onlyLogo && (
        <nav className="flex items-center gap-2 sm:gap-4">
          <Button asChild variant="ghost">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/sign-up">Sign up</Link>
          </Button>
        </nav>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="Toggle dark mode" onClick={toggleTheme}>
        <SunMoon />
      </Button>
    </header>
  );
}
