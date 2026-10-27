import { X } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { MAX_PERSONA_INTERESTS, type InterestGroup, type Interest } from "@/types/interest";

export default function InterestPicker({
  groups,
  retired,
  value,
  onChange,
  max = MAX_PERSONA_INTERESTS,
  showCount = true,
}: {
  groups: InterestGroup[];
  retired: Interest[];
  value: number[];
  onChange: (ids: number[]) => void;
  max?: number;
  showCount?: boolean;
}) {
  const selected = new Set(value);
  const full = value.length >= max;
  const toggle = (id: number) =>
    onChange(selected.has(id) ? value.filter((v) => v !== id) : full ? value : [...value, id]);
  const keptRetired = retired.filter((r) => selected.has(r.id));

  return (
    <div className="flex flex-col gap-5">
      {showCount && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {value.length} / {max} selected
        </p>
      )}

      {keptRetired.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="text-overline font-semibold uppercase text-muted-foreground">No longer offered</p>
          <div className="flex flex-wrap gap-2">
            {keptRetired.map((r) => (
              <Chip key={r.id} emoji={r.emoji} onClick={() => toggle(r.id)} aria-label={`Remove ${r.name}`}>
                {r.name}
                <X className="text-muted-foreground" />
              </Chip>
            ))}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-2.5" aria-labelledby={`interest-group-${g.id}`}>
          <h3 id={`interest-group-${g.id}`} className="text-overline font-semibold uppercase text-muted-foreground">
            {g.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {g.interests.map((i) => {
              const on = selected.has(i.id);
              return (
                <Chip key={i.id} emoji={i.emoji} selected={on} disabled={!on && full} onClick={() => toggle(i.id)}>
                  {i.name}
                </Chip>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
