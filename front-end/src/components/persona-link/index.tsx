import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const personaPath = (id: string | number) => `/personas/${id}`;

// Anonymous personas have no page for this viewer, so they stay plain text.
export function PersonaLink({
  personaId,
  anonymous,
  className,
  tabIndex,
  children,
}: {
  personaId: string | number;
  anonymous: boolean;
  className?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  if (anonymous) return <span className={className}>{children}</span>;
  return (
    <Link
      to={personaPath(personaId)}
      tabIndex={tabIndex}
      className={cn("hover:underline underline-offset-2", className)}
    >
      {children}
    </Link>
  );
}
