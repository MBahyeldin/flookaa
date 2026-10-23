import { Link } from "react-router-dom";
import { Boxes, Clock, Globe, Lock, ShieldCheck } from "lucide-react";
import { AboutBlock, AboutFact, AboutFacts, monthYear } from "@/components/about-block";
import InterestChips from "@/components/interests/InterestChips";
import { PersonaLink } from "@/components/persona-link";
import type { Interest } from "@/types/interest";

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
    <AboutBlock>
      {description && <p className="whitespace-pre-line">{description}</p>}
      {interests.length > 0 && <InterestChips interests={interests} />}
      <AboutFacts>
        <AboutFact icon={isPrivate ? Lock : Globe}>
          {isPrivate ? "Private · members read and post; joining takes a request" : "Public · anyone can read and join"}
        </AboutFact>
        {createdAt && (
          <AboutFact icon={Clock}>
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
          </AboutFact>
        )}
        <AboutFact icon={ShieldCheck}>{minAge}+</AboutFact>
        {community && (
          <AboutFact icon={Boxes}>
            <span>
              Part of{" "}
              <Link to={`/communities/${community.slug}`} className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {community.name}
              </Link>
            </span>
          </AboutFact>
        )}
      </AboutFacts>
    </AboutBlock>
  );
}
