import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SkeletonList } from "@/components/ui/skeleton";
import { getPersonaInterests } from "@/services/interests";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Interest, InterestGroup } from "@/types/interest";

/** One interest at a time, by slug; "" is All. The row shows the current persona's interests, the sheet all of them. */
export default function InterestFilter({
  value,
  onChange,
  onSelectedName,
}: {
  value: string;
  onChange: (slug: string) => void;
  onSelectedName?: (name: string) => void;
}) {
  const persona = useUserProfileStore((s) => s.persona);
  const [groups, setGroups] = useState<InterestGroup[] | null>(null);
  const [mine, setMine] = useState<number[]>([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!persona) return;
    let alive = true;
    setFailed(false);
    getPersonaInterests(Number(persona.id)).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setGroups(r.data.groups);
        setMine(r.data.selected);
      } else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [persona, attempt]);

  const all = groups?.flatMap((g) => g.interests) ?? [];
  const selected = all.find((i) => i.slug === value);
  const mineSet = new Set(mine);
  const row = all.filter((i) => mineSet.has(i.id));
  if (selected && !mineSet.has(selected.id)) row.unshift(selected);

  const selectedName = selected?.name ?? "";
  useEffect(() => onSelectedName?.(selectedName), [selectedName, onSelectedName]);

  const pick = (slug: string) => onChange(value === slug ? "" : slug);

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip kind="filter" selected={!value} onClick={() => onChange("")}>
          All
        </Chip>
        {row.map((i) => (
          <InterestChip key={i.id} interest={i} selected={value === i.slug} onPick={pick} />
        ))}
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
        <SlidersHorizontal />
        All interests
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>All interests</SheetTitle>
            <SheetDescription>Show only what's tagged with one interest.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-4 pb-6">
            {failed ? (
              <ErrorState compact title="Couldn't load interests" onRetry={() => setAttempt((n) => n + 1)} />
            ) : !groups ? (
              <SkeletonList count={4} />
            ) : (
              groups
                .filter((g) => g.interests.length > 0)
                .map((g) => (
                  <section key={g.id} className="flex flex-col gap-2">
                    <h3 className="text-overline text-muted-foreground">{g.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {g.interests.map((i) => (
                        <InterestChip
                          key={i.id}
                          interest={i}
                          selected={value === i.slug}
                          onPick={(slug) => {
                            pick(slug);
                            setOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InterestChip({
  interest,
  selected,
  onPick,
}: {
  interest: Interest;
  selected: boolean;
  onPick: (slug: string) => void;
}) {
  return (
    <Chip kind="filter" emoji={interest.emoji} selected={selected} onClick={() => onPick(interest.slug)}>
      {interest.name}
    </Chip>
  );
}
