import { Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/Auth.context";

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const { pathname, search } = useLocation();

  return (
    <div className="flex w-full flex-col items-center gap-4 px-4 pt-24 pb-12 md:pt-48">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-lg bg-surface-sunken px-8 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border bg-card">
          <Search aria-hidden="true" className="size-[22px] text-primary" />
        </div>
        <h1 className="text-h4 font-medium text-foreground">Page not found</h1>
        <p className="max-w-[296px] text-sm text-muted-foreground">
          {isAuthenticated
            ? "The link may be old, or the page is private or was removed."
            : "The link may be old, or you need to log in to see it."}
        </p>
      </div>
      <Button asChild>
        {isAuthenticated ? (
          <Link to="/">Back to your feed</Link>
        ) : (
          <Link to={`/login?next=${encodeURIComponent(pathname + search)}`}>Log in to continue</Link>
        )}
      </Button>
    </div>
  );
}
