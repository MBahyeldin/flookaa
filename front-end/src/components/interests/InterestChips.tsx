import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import type { Interest } from "@/types/interest";

export default function InterestChips({
  interests,
  limit,
  className,
}: {
  interests: Interest[];
  limit?: number;
  className?: string;
}) {
  if (interests.length === 0) return null;
  const shown = limit ? interests.slice(0, limit) : interests;
  const more = interests.length - shown.length;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Interests">
      {shown.map((i) => (
        <li key={i.id}>
          <Chip size="sm" emoji={i.emoji}>
            {i.name}
          </Chip>
        </li>
      ))}
      {more > 0 && (
        <li className="inline-flex items-center rounded-full px-2 py-0.5 text-xs text-muted-foreground">+{more}</li>
      )}
    </ul>
  );
}
