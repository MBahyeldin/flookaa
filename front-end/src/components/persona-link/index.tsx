import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PersonaCard } from "./PersonaCard";

export const personaPath = (id: string | number) => `/personas/${id}`;

export function PersonaLink({
  personaId,
  anonymous,
  name,
  thumbnail,
  className,
  tabIndex,
  children,
}: {
  personaId: string | number;
  anonymous: boolean;
  name: string;
  thumbnail?: string;
  className?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          tabIndex={tabIndex}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "cursor-pointer text-left hover:underline underline-offset-2",
            className,
          )}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64"
        onClick={(e) => e.stopPropagation()}
      >
        {open && (
          <PersonaCard
            personaId={Number(personaId)}
            name={name}
            thumbnail={thumbnail}
            anonymous={anonymous}
            profilePath={personaPath(personaId)}
            onNavigate={() => setOpen(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
