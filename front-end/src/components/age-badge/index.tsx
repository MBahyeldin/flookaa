import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BASE_MIN_AGE } from "@/lib/minAge";
import { t } from "@/i18n";

export function AgeBadge({ minAge, className }: { minAge: number; className?: string }) {
  if (minAge <= BASE_MIN_AGE) return null;
  return (
    <Badge variant="secondary" className={cn("tabular-nums", className)} aria-label={t("common:age.label", { age: minAge })}>
      {t("common:age.short", { age: minAge })}
    </Badge>
  );
}
