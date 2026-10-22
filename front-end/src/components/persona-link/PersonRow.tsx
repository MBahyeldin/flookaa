import type { ReactNode } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";

export type RowPerson = {
  persona_id: number;
  first_name: string;
  last_name: string;
  name?: string;
  thumbnail: string;
  anonymous: boolean;
};

export const displayName = (p: RowPerson) => `${p.first_name} ${p.last_name}`.trim() || p.name || "";

export function PersonRow({
  person,
  detail,
  badge,
  children,
}: {
  person: RowPerson;
  detail: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <PersonaLink
        personaId={person.persona_id}
        anonymous={person.anonymous}
        name={displayName(person)}
        thumbnail={person.thumbnail || undefined}
        tabIndex={-1}
        className="shrink-0"
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={person.thumbnail || ""} />
          <GeneratedAvatarFallback name={displayName(person)} />
        </Avatar>
      </PersonaLink>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PersonaLink
            personaId={person.persona_id}
            anonymous={person.anonymous}
            name={displayName(person)}
            thumbnail={person.thumbnail || undefined}
            className="truncate text-sm font-medium"
          >
            {displayName(person)}
          </PersonaLink>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}
