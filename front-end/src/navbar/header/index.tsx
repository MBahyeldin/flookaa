"use client";

import { Link } from "react-router-dom";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import logoLight from "../../assets/images/logo-light.png";
import logoDark from "../../assets/images/logo-dark.png";
import { Button } from "@/components/ui/button";
import { ToggleTheme } from "@/components/toggle-theme";
import { useTheme } from "@/Theme.context";

export default function Header() {
  const { isDarkMode } = useTheme();

  const items = [
    { to: "/login", label: "Login", variant: "outline", borderRadius: "full" },
    { to: "/sign-up", label: "Join FLOOKA", variant: "default", borderRadius: "full" },
  ];

  return (
    <header className="fixed w-full px-6 py-2  flex items-center justify-between top-0 left-0 z-50 bg-background/90 backdrop-blur-md">
      <Link to="/">
        <div className="flex items-center gap-1">
          <img src={isDarkMode ? logoDark : logoLight} alt="Logo" className="h-16" />
        </div>
      </Link>
      {/* Navigation Menu */}
      <div className="flex items-center gap-4">
        <NavigationMenu viewport={false} className="hidden sm:block">
          <NavigationMenuList>
            {items.map((item) => (
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to={item.to}>
                    <Button variant={item.variant} borderRadius={item.borderRadius}>
                      {item.label}
                    </Button>
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <ToggleTheme />
      </div>
    </header>
  );
}

