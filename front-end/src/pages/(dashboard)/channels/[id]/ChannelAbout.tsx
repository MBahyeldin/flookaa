import { Link } from "react-router-dom";
import { Boxes, Clock, Globe, Lock, ShieldCheck } from "lucide-react";
import InterestChips from "@/components/interests/InterestChips";
import { PersonaLink } from "@/components/persona-link";
import type { Interest } from "@/types/interest";

const monthYear = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function ChannelAbout({
  description,
  interests,
  isPrivate,
  minAge,
  createdAt,
  owner,
  community,
}: {
  description?: string | null;
  interests: Interest[];
  isPrivate: boolean;
  minAge: number;
  createdAt?: string;
  owner: { id: string | number; username: string; profileImageUrl?: string | null; anonymous: boolean };
  community: { name: string; slug: string } | null | undefined;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-surface-sunken p-6">
      <h2 className="text-overline font-semibold tracking-wider text-muted-foreground uppercase">About</h2>
      {description && <p className="whitespace-pre-line">{description}</p>}
      {interests.length > 0 && <InterestChips interests={interests} />}
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          {isPrivate ? <Lock className="size-4 shrink-0" /> : <Globe className="size-4 shrink-0" />}
          {isPrivate ? "Private · members read and post; joining takes a request" : "Public · anyone can read and join"}
        </li>
        {createdAt && (
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            <span>
              Created {monthYear(createdAt)} by{" "}
              <PersonaLink
                personaId={owner.id}
                anonymous={owner.anonymous}
                name={owner.username}
                thumbnail={owner.profileImageUrl || undefined}
                className="font-medium"
              >
                {owner.username}
              </PersonaLink>
            </span>
          </li>
        )}
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0" />
          {minAge}+
        </li>
        {community && (
          <li className="flex items-center gap-2">
            <Boxes className="size-4 shrink-0" />
            <span>
              Part of{" "}
              <Link to={`/communities/${community.slug}`} className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {community.name}
              </Link>
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
