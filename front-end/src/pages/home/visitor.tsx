import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cover } from "@/components/cover";
import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getShowcase } from "@/services/communities";
import { formatCompact } from "@/lib/format";
import { useTranslation } from "react-i18next";
import type { ShowcaseCommunity } from "@/types/community";
import { cn } from "@/lib/utils";

const FEATURES: { icon: LucideIcon; id: "personas" | "places" | "privacy" }[] = [
  { icon: UserRound, id: "personas" },
  { icon: Users, id: "places" },
  { icon: ShieldCheck, id: "privacy" },
];

const GUTTER = "px-4 md:px-6 lg:px-20";
const INDENTS = ["", "pl-4 md:pl-8", "pl-8 md:pl-16"];

export default function VisitorPage() {
  const { t } = useTranslation(["auth", "common"]);
  const [showcase, setShowcase] = useState<ShowcaseCommunity[] | null>(null);

  useEffect(() => {
    getShowcase().then((res) => setShowcase(res.ok ? res.data.communities : []));
  }, []);

  return (
    <>
      <section className={cn(GUTTER, "flex flex-col gap-10 pt-8 pb-16 md:flex-row md:items-center md:gap-8 md:pt-16 md:pb-20 lg:gap-16 lg:pt-20 lg:pb-24")}>
        <div className="flex flex-1 flex-col items-start gap-5">
          <p className="text-overline font-semibold uppercase text-primary">{t("visitor.overline")}</p>
          <h1 className="text-display font-semibold text-foreground">{t("split.tagline")}</h1>
          <p className="text-lead font-light text-muted-foreground">{t("visitor.lead")}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/sign-up">{t("visitor.cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="hidden md:inline-flex">
              <a href="#how-it-works">{t("visitor.howItWorks")}</a>
            </Button>
          </div>
        </div>
        {showcase?.length !== 0 && (
          <div className="flex flex-1 flex-col gap-4">
            {showcase
              ? showcase.map((community, i) => (
                  <div key={community.slug} className={INDENTS[i]}>
                    <ShowcaseCard community={community} />
                  </div>
                ))
              : INDENTS.map((indent) => (
                  <div key={indent} className={indent}>
                    <Skeleton className="h-[170px] rounded-xl" />
                  </div>
                ))}
          </div>
        )}
      </section>

      <section id="how-it-works" className={cn(GUTTER, "flex scroll-mt-4 flex-col gap-8 bg-surface-sunken py-12 md:py-16 lg:py-20")}>
        <h2>{t("visitor.howItWorks")}</h2>
        <div className="grid gap-8 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, id }) => (
            <div key={id} className="flex flex-col items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full border bg-card">
                <Icon aria-hidden className="size-5 text-primary" />
              </span>
              <h3>{t(`visitor.features.${id}.title`)}</h3>
              <p className="leading-relaxed text-muted-foreground">{t(`visitor.features.${id}.body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ShowcaseCard({ community }: { community: ShowcaseCommunity }) {
  const { t } = useTranslation();
  return (
    <div data-theme={community.theme} className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <Cover pattern={community.cover_pattern} className="h-24" />
      <div className="flex items-center gap-3 px-4 py-3">
        <Logo name={community.name} src={community.thumbnail} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{community.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t("counts.members", { count: community.members_count, n: formatCompact(community.members_count) })} ·{" "}
            {t("counts.channels", { count: community.channels_count, n: formatCompact(community.channels_count) })}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/sign-up">{t("actions.join")}</Link>
        </Button>
      </div>
    </div>
  );
}
