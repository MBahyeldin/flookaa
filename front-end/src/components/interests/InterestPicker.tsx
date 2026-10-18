import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_PERSONA_INTERESTS, type InterestGroup, type Interest } from "@/types/interest";

export default function InterestPicker({
  groups,
  retired,
  value,
  onChange,
  max = MAX_PERSONA_INTERESTS,
}: {
  groups: InterestGroup[];
  retired: Interest[];
  value: number[];
  onChange: (ids: number[]) => void;
  max?: number;
}) {
  const selected = new Set(value);
  const full = value.length >= max;
  const toggle = (id: number) =>
    onChange(selected.has(id) ? value.filter((v) => v !== id) : full ? value : [...value, id]);
  const keptRetired = retired.filter((r) => selected.has(r.id));

  return (
    <div className="@container flex flex-col gap-6">
      <p className="text-sm text-muted-foreground text-center" aria-live="polite">
        {value.length} / {max} selected
      </p>

      {keptRetired.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">No longer offered</p>
          <div className="flex flex-wrap gap-2">
            {keptRetired.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggle(r.id)}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm text-foreground hover:bg-accent"
                aria-label={`Remove ${r.name}`}
              >
                <span aria-hidden>{r.emoji}</span>
                {r.name}
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-3" aria-labelledby={`interest-group-${g.id}`}>
          <h3 id={`interest-group-${g.id}`} className="text-sm font-semibold text-foreground">
            {g.name}
          </h3>
          <div className="grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4">
            {g.interests.map((i) => {
              const on = selected.has(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => toggle(i.id)}
                  className={cn(
                    "flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-4 text-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                    on ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-primary hover:bg-accent",
                  )}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {i.emoji}
                  </span>
                  <span className="text-center">{i.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
