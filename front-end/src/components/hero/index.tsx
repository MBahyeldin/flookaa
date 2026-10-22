import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Text sits below the cover, never on it; the media overlaps the cover's bottom edge.
export function Hero({
  cover,
  media,
  tags,
  name,
  tagline,
  facts,
  actions,
  className,
}: {
  cover: ReactNode;
  media: ReactNode;
  tags?: ReactNode;
  name: ReactNode;
  tagline?: ReactNode;
  facts?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("bg-background pb-5 md:pb-8", className)}>
      <div className="-mb-10 h-[150px] overflow-hidden md:-mb-14 md:h-[280px]">{cover}</div>
      <div className="flex flex-col items-start gap-3 px-4 md:flex-row md:gap-6 md:px-8 xl:px-16">
        <div className="relative shrink-0">{media}</div>
        <div className="flex w-full min-w-0 flex-col items-start gap-2 md:flex-1 md:pt-[68px]">
          {tags && <div className="flex flex-wrap items-center gap-1.5">{tags}</div>}
          <h1 className="w-full text-display font-semibold tracking-tight break-words">{name}</h1>
          {tagline && <p className="line-clamp-2 text-lead font-light text-muted-foreground">{tagline}</p>}
          {facts && <p className="text-sm text-muted-foreground">{facts}</p>}
        </div>
        {actions && (
          <div className="flex w-full shrink-0 gap-2 pt-1 md:w-auto md:pt-[68px]">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
