import { Link } from "react-router-dom";
import { Boxes, Clock, Globe, Lock, ShieldCheck } from "lucide-react";
import { AboutBlock, AboutFact, AboutFacts } from "@/components/about-block";
import { formatMonthYear } from "@/lib/format";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["channels", "common"]);
  return (
    <AboutBlock>
      {description && <p className="whitespace-pre-line">{description}</p>}
      {interests.length > 0 && <InterestChips interests={interests} />}
      <AboutFacts>
        <AboutFact icon={isPrivate ? Lock : Globe}>
          {isPrivate ? t("about.private") : t("about.public")}
        </AboutFact>
        {createdAt && (
          <AboutFact icon={Clock}>
            <span>
              <Trans
                t={t}
                i18nKey="about.createdBy"
                values={{ date: formatMonthYear(createdAt), name: owner.username }}
                components={{
                  owner: (
                    <PersonaLink
                      personaId={owner.id}
                      anonymous={owner.anonymous}
                      name={owner.username}
                      thumbnail={owner.profileImageUrl || undefined}
                      className="font-medium"
                    >
                      {owner.username}
                    </PersonaLink>
                  ),
                }}
              />
            </span>
          </AboutFact>
        )}
        <AboutFact icon={ShieldCheck}>{t("common:age.short", { age: minAge })}</AboutFact>
        {community && (
          <AboutFact icon={Boxes}>
            <span>
              <Trans
                t={t}
                i18nKey="partOfLink"
                values={{ community: community.name }}
                components={{
                  link: (
                    <Link
                      to={`/communities/${community.slug}`}
                      className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    />
                  ),
                }}
              />
            </span>
          </AboutFact>
        )}
      </AboutFacts>
    </AboutBlock>
  );
}
