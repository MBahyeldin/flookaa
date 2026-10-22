import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BASE_MIN_AGE } from "@/lib/minAge";

export function AgeBadge({ minAge, className }: { minAge: number; className?: string }) {
  if (minAge <= BASE_MIN_AGE) return null;
  return (
    <Badge variant="secondary" className={cn("tabular-nums", className)} aria-label={`Ages ${minAge} and over`}>
      {minAge}+
    </Badge>
  );
}
