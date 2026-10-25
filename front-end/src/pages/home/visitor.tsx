import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cover } from "@/components/cover";
import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getShowcase } from "@/services/communities";
import { formatCount } from "@/lib/format";
import type { ShowcaseCommunity } from "@/types/community";
import { cn } from "@/lib/utils";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: UserRound,
    title: "Personas",
    body: "Make a persona for each side of you. People follow the persona, never the account behind it.",
  },
  {
    icon: Users,
    title: "Channels and communities",
    body: "Every channel and community has its own page, colours and rules. Communities group the channels that belong together.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy you choose",
    body: "Public, private or only you. Private personas appear anonymous until someone you approve follows them.",
  },
];

const GUTTER = "px-4 md:px-6 lg:px-20";
const INDENTS = ["", "pl-4 md:pl-8", "pl-8 md:pl-16"];

export default function VisitorPage() {
  const [showcase, setShowcase] = useState<ShowcaseCommunity[] | null>(null);

  useEffect(() => {
    getShowcase().then((res) => setShowcase(res.ok ? res.data.communities : []));
  }, []);

  return (
    <>
      <section className={cn(GUTTER, "flex flex-col gap-10 pt-8 pb-16 md:flex-row md:items-center md:gap-8 md:pt-16 md:pb-20 lg:gap-16 lg:pt-20 lg:pb-24")}>
        <div className="flex flex-1 flex-col items-start gap-5">
          <p className="text-overline font-semibold uppercase text-primary">Channels and communities</p>
          <h1 className="text-display font-semibold text-foreground">Follow a facet, not a person.</h1>
          <p className="text-lead font-light text-muted-foreground">
            Flookaa is a home for the channels and communities you belong to. Join as the side of you that fits: your
            sport self, your work self, your cooking self.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/sign-up">Create your first persona</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="hidden md:inline-flex">
              <a href="#how-it-works">How it works</a>
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
        <h2>How it works</h2>
        <div className="grid gap-8 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full border bg-card">
                <Icon aria-hidden className="size-5 text-primary" />
              </span>
              <h3>{title}</h3>
              <p className="leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ShowcaseCard({ community }: { community: ShowcaseCommunity }) {
  return (
    <div data-theme={community.theme} className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <Cover pattern={community.cover_pattern} className="h-24" />
      <div className="flex items-center gap-3 px-4 py-3">
        <Logo name={community.name} src={community.thumbnail} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{community.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatCount(community.members_count, "member", "members")} · {formatCount(community.channels_count, "channel", "channels")}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/sign-up">Join</Link>
        </Button>
      </div>
    </div>
  );
}
