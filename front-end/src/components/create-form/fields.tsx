import { useId } from "react";
import { Globe, Lock } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { CoverOptionGroup } from "@/components/ui/cover-option";
import { Label } from "@/components/ui/label";
import { RadioCard, RadioCardGroup } from "@/components/ui/radio-card";
import { ThemeSwatch } from "@/components/ui/theme-swatch";
import { MIN_AGES } from "@/lib/minAge";
import { PALETTES, type PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";

export type Visibility = "public" | "private";

/** `inherit` adds a first swatch for the community's palette; picking it sets the value to null. */
export function ThemeField({
  value,
  onChange,
  inherit,
}: {
  value: PaletteId | null;
  onChange: (theme: PaletteId | null) => void;
  inherit?: PaletteId;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label id={id}>Theme</Label>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-3">
        {inherit && (
          <ThemeSwatch palette={inherit} label="Community's" checked={value === null} onSelect={() => onChange(null)} />
        )}
        {PALETTES.map((p) => (
          <ThemeSwatch key={p.id} palette={p.id} label={p.label} checked={p.id === value} onSelect={() => onChange(p.id)} />
        ))}
      </div>
    </div>
  );
}

export function CoverField({ value, onChange }: { value: CoverPattern; onChange: (cover: CoverPattern) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label id={id}>Cover</Label>
      <CoverOptionGroup aria-labelledby={id} value={value} onChange={onChange} />
    </div>
  );
}

export function VisibilityField({
  value,
  onChange,
  privateBody,
}: {
  value: Visibility;
  onChange: (visibility: Visibility) => void;
  privateBody: string;
}) {
  return (
    <RadioCardGroup aria-label="Visibility">
      <RadioCard
        icon={Globe}
        title="Public"
        body="Anyone can read. Members post, comment and like."
        checked={value === "public"}
        onSelect={() => onChange("public")}
      />
      <RadioCard icon={Lock} title="Private" body={privateBody} checked={value === "private"} onSelect={() => onChange("private")} />
    </RadioCardGroup>
  );
}

export function AgeField({
  value,
  onChange,
  error,
  helper = "Only people this age or older find it. You can raise it later.",
}: {
  value: number;
  onChange: (age: number) => void;
  error?: string;
  helper?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label id={id}>Age limit</Label>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {MIN_AGES.map((age) => (
          <Chip
            key={age}
            kind="filter"
            role="radio"
            aria-checked={value === age}
            selected={value === age}
            onClick={() => onChange(age)}
          >
            {age}+
          </Chip>
        ))}
      </div>
      <p role={error ? "alert" : undefined} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {error ?? helper}
      </p>
    </div>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  );
}

export const BASE_ERRORS: Record<string, { field: string; message: string }> = {
  invalid_name: { field: "name", message: "Enter a name of at most 100 characters." },
  invalid_min_age: { field: "min_age", message: "You can't set a limit above your own age." },
  invalid_interests: { field: "interest_ids", message: "Pick 1 to 5 interests." },
  invalid_interest: { field: "interest_ids", message: "One of these interests is no longer offered." },
  invalid_logo: { field: "thumbnail", message: "That logo can't be used. Upload it again." },
  invalid_theme: { field: "theme", message: "Pick one of the themes." },
  invalid_cover_pattern: { field: "cover_pattern", message: "Pick one of the covers." },
};
