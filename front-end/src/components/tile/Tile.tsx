import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import InterestChips from "@/components/interests/InterestChips";
import type { Interest } from "@/types/interest";
import type { PaletteId } from "@/themes/palettes";

// Only the logo and the accent edge take the entity's palette; lists stay calm.
export function Tile({
  theme,
  name,
  logo,
  href,
  meta,
  description,
  interests,
  facts,
  children,
}: {
  theme: PaletteId;
  name: string;
  logo?: string;
  href?: string;
  meta: ReactNode;
  description?: string;
  interests: Interest[];
  facts?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <div data-theme={theme} className="h-1 bg-primary" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <span data-theme={theme} className="contents">
            <Logo name={name} src={logo} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-h4 font-medium">
              {href ? (
                <Link to={href} className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{meta}</div>
          </div>
        </div>
        {description && <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>}
        <InterestChips interests={interests} limit={3} />
        {facts && <p className="text-xs text-muted-foreground">{facts}</p>}
        {children && <div className="mt-auto flex gap-2 pt-1">{children}</div>}
      </div>
    </Card>
  );
}
