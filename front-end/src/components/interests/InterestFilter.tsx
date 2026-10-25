import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SkeletonList } from "@/components/ui/skeleton";
import { getPersonaInterests } from "@/services/interests";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Interest, InterestGroup } from "@/types/interest";

/**
 * Any number of interests, by slug; none is All. The row shows the current
 * persona's interests, the sheet all of them. `forYou` adds a first chip for a
 * mode of its own (Discover).
 */
export default function InterestFilter({
  value,
  onChange,
  onSelectedNames,
  onMineLoaded,
  forYou,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  onSelectedNames?: (names: string[]) => void;
  onMineLoaded?: (ids: number[]) => void;
  forYou?: { selected: boolean; onSelect: () => void };
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

  useEffect(() => {
    if (groups) onMineLoaded?.(mine);
  }, [groups, mine, onMineLoaded]);

  const all = groups?.flatMap((g) => g.interests) ?? [];
  const picked = new Set(value);
  const selected = all.filter((i) => picked.has(i.slug));
  const mineSet = new Set(mine);
  const row = [...selected.filter((i) => !mineSet.has(i.id)), ...all.filter((i) => mineSet.has(i.id))];

  const selectedNames = selected.map((i) => i.name).join("\n");
  useEffect(() => onSelectedNames?.(selectedNames ? selectedNames.split("\n") : []), [selectedNames, onSelectedNames]);

  const toggle = (slug: string) => onChange(picked.has(slug) ? value.filter((s) => s !== slug) : [...value, slug]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {forYou && (
          <Chip kind="filter" selected={forYou.selected} onClick={forYou.onSelect}>
            For you
          </Chip>
        )}
        <Chip kind="filter" selected={value.length === 0 && !forYou?.selected} onClick={() => onChange([])}>
          All
        </Chip>
        {row.map((i) => (
          <InterestChip key={i.id} interest={i} selected={picked.has(i.slug)} onPick={toggle} />
        ))}
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
        <SlidersHorizontal />
        All interests
        {value.length > 0 && <Badge variant="count">{value.length}</Badge>}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>All interests</SheetTitle>
            <SheetDescription>Show what's tagged with any of the interests you pick.</SheetDescription>
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
                        <InterestChip key={i.id} interest={i} selected={picked.has(i.slug)} onPick={toggle} />
                      ))}
                    </div>
                  </section>
                ))
            )}
          </div>
          <SheetFooter className="sticky bottom-0 flex-row justify-end gap-2 border-t bg-background">
            {value.length > 0 && (
              <Button variant="ghost" onClick={() => onChange([])}>
                Clear
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>Done</Button>
          </SheetFooter>
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
