import { cn } from "@/lib/utils";
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
        <li
          key={i.id}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          <span aria-hidden>{i.emoji}</span>
          {i.name}
        </li>
      ))}
      {more > 0 && (
        <li className="inline-flex items-center rounded-full px-2 py-0.5 text-xs text-muted-foreground">+{more}</li>
      )}
    </ul>
  );
}
