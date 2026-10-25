import { Link } from "react-router-dom";
import { FollowButton } from "@/components/follow-button";
import { personaPath } from "@/components/persona-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/ui/logo";
import { formatCount } from "@/lib/format";
import type { FollowStatus, PublicPersona } from "@/types/persona";
import { fullName } from "./ProfileHero";

export function ProfileConnected({
  personas,
  viewerId,
  onFollowChange,
}: {
  personas: PublicPersona[];
  viewerId?: string | number;
  onFollowChange: (personaId: number, status: FollowStatus) => void;
}) {
  return (
    <section className="flex max-w-[560px] flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Other public personas of the same person, linked by them. Private ones never show here.
      </p>
      <ul className="flex flex-col gap-1">
        {personas.map((p) => {
          const name = fullName(p);
          return (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <Link
                to={personaPath(p.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Avatar size="md">
                  {p.thumbnail && <AvatarImage src={p.thumbnail} />}
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium hover:underline">{name}</span>
                  {p.name && <span className="block truncate text-xs">{p.name}</span>}
                  <span className="block truncate text-xs text-muted-foreground">
                    @{p.slug}
                    {p.followers_count !== undefined && ` · ${formatCount(p.followers_count, "follower", "followers")}`}
                  </span>
                </span>
              </Link>
              {String(p.id) !== String(viewerId) && (
                <FollowButton
                  personaId={p.id}
                  name={name}
                  status={p.follow_status ?? null}
                  onChange={(status) => onFollowChange(p.id, status)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
