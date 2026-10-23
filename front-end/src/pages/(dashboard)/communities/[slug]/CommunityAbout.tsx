import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Globe, Lock, ShieldCheck } from "lucide-react";
import InterestChips from "@/components/interests/InterestChips";
import { PersonaLink } from "@/components/persona-link";
import { AboutBlock, AboutFact, AboutFacts, monthYear, overlineClass } from "@/components/about-block";
import type { Community } from "@/types/community";

const SHOWN_RULES = 5;

// Rules are free text; authors who number or bullet their lines get the same list.
const ruleLines = (rules: string) =>
  rules
    .split("\n")
    .map((line) => line.trim().replace(/^(\d+[.)]|[-•*])\s*/, ""))
    .filter(Boolean);

export function CommunityAbout({ community, className }: { community: Community; className?: string }) {
  const [allRules, setAllRules] = useState(false);
  const isPrivate = community.visibility === "private";
  const owner = community.owner;
  const ownerName = owner ? [owner.first_name, owner.last_name].filter(Boolean).join(" ") : "";
  const rules = ruleLines(community.rules);
  const shown = allRules ? rules : rules.slice(0, SHOWN_RULES);

  return (
    <AboutBlock className={className}>
      {community.description && <p className="whitespace-pre-line">{community.description}</p>}
      {community.interests.length > 0 && <InterestChips interests={community.interests} />}
      <AboutFacts>
        <AboutFact icon={isPrivate ? Lock : Globe}>
          {isPrivate ? "Private · members see inside; joining takes a request" : "Public · anyone can read and join"}
        </AboutFact>
        <AboutFact icon={Clock}>
          <span>
            Created {monthYear(community.created_at)}
            {owner && (
              <>
                {" by "}
                <PersonaLink
                  personaId={owner.id}
                  anonymous={owner.anonymous}
                  name={ownerName}
                  thumbnail={owner.thumbnail || undefined}
                  className="font-medium"
                >
                  {ownerName}
                </PersonaLink>
              </>
            )}
          </span>
        </AboutFact>
        <AboutFact icon={ShieldCheck}>{community.min_age}+</AboutFact>
      </AboutFacts>

      {rules.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <h3 className={overlineClass}>Rules</h3>
          <ol className="flex flex-col gap-2 text-sm">
            {shown.map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-4 shrink-0 font-semibold text-primary tabular-nums">{i + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
          {rules.length > SHOWN_RULES && (
            <button
              type="button"
              onClick={() => setAllRules((v) => !v)}
              className="flex cursor-pointer items-center gap-1 self-start rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {allRules ? "Show fewer" : `Show all ${rules.length} rules`}
              {allRules ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          )}
        </div>
      )}
    </AboutBlock>
  );
}
