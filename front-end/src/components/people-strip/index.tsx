import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import { displayName, type RowPerson } from "@/components/persona-link/PersonRow";
import { overlineClass } from "@/components/about-block";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

const STRIP = 6;

function StripAvatar({ person, className }: { person: RowPerson; className?: string }) {
  return (
    <PersonaLink
      personaId={person.persona_id}
      anonymous={person.anonymous}
      name={displayName(person)}
      thumbnail={person.thumbnail || undefined}
      className="shrink-0 rounded-full"
    >
      <Avatar className={cn("border-2 border-background", person.anonymous && "border-dashed", className)}>
        {!person.anonymous && <AvatarImage src={person.thumbnail || ""} />}
        <GeneratedAvatarFallback name={displayName(person)} />
      </Avatar>
    </PersonaLink>
  );
}

export function PeopleStrip({
  people,
  total,
  moderators,
  onShowAll,
}: {
  people: RowPerson[];
  total: number;
  moderators: RowPerson[];
  onShowAll?: () => void;
}) {
  const rest = total - Math.min(people.length, STRIP);
  const more = formatCount(rest, "member", "members");

  return (
    <div className="flex flex-col gap-3">
      <h2 className={overlineClass}>People</h2>
      <div className="flex items-center">
        {people.slice(0, STRIP).map((p) => (
          <StripAvatar key={p.persona_id} person={p} className="-me-2 size-10" />
        ))}
        {rest > 0 &&
          (onShowAll ? (
            <button
              type="button"
              onClick={onShowAll}
              className="ms-4 cursor-pointer rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              +{more}
            </button>
          ) : (
            <span className="ps-4 text-sm text-muted-foreground">+{more}</span>
          ))}
      </div>
      {moderators.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Moderators</span>
          {moderators.map((m) => (
            <span key={m.persona_id} className="flex items-center gap-1.5">
              <StripAvatar person={m} className="size-6 border-0" />
              {displayName(m)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
