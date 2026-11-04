import { useId } from "react";
import { Globe, Lock } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { CoverOptionGroup } from "@/components/ui/cover-option";
import { Label } from "@/components/ui/label";
import { RadioCard, RadioCardGroup } from "@/components/ui/radio-card";
import { ThemeSwatch } from "@/components/ui/theme-swatch";
import { MIN_AGES } from "@/lib/minAge";
import { PALETTES, paletteLabel, type PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";
import { t } from "@/i18n";

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
      <Label id={id}>{t("common:look.theme")}</Label>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-3">
        {inherit && (
          <ThemeSwatch palette={inherit} label={t("common:look.communityTheme")} checked={value === null} onSelect={() => onChange(null)} />
        )}
        {PALETTES.map((p) => (
          <ThemeSwatch key={p.id} palette={p.id} label={paletteLabel(p.id)} checked={p.id === value} onSelect={() => onChange(p.id)} />
        ))}
      </div>
    </div>
  );
}

export function CoverField({
  value,
  onChange,
  label,
  hint,
}: {
  value: CoverPattern;
  onChange: (cover: CoverPattern) => void;
  label?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label id={id}>{label ?? t("common:look.cover")}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
    <RadioCardGroup aria-label={t("common:create.visibility")}>
      <RadioCard
        icon={Globe}
        title={t("common:visibility.public")}
        body={t("common:create.publicBody")}
        checked={value === "public"}
        onSelect={() => onChange("public")}
      />
      <RadioCard icon={Lock} title={t("common:visibility.private")} body={privateBody} checked={value === "private"} onSelect={() => onChange("private")} />
    </RadioCardGroup>
  );
}

export function AgeField({
  value,
  onChange,
  error,
  helper = t("common:age.helper"),
}: {
  value: number;
  onChange: (age: number) => void;
  error?: string;
  helper?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label id={id}>{t("common:age.limit")}</Label>
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
            {t("common:age.short", { age })}
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

/** The form field each create error belongs to; the message is errorMessage(code). */
export const BASE_ERROR_FIELDS: Record<string, string> = {
  invalid_name: "name",
  invalid_min_age: "min_age",
  invalid_interests: "interest_ids",
  invalid_interest: "interest_ids",
  invalid_logo: "thumbnail",
  invalid_theme: "theme",
  invalid_cover_pattern: "cover_pattern",
};
