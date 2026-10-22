import {
  Bird,
  Cat,
  Dog,
  Feather,
  Fish,
  PawPrint,
  Rabbit,
  Shell,
  Snail,
  Squirrel,
  Turtle,
  type LucideIcon,
} from "lucide-react";
import { AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ICONS: LucideIcon[] = [Bird, Cat, Dog, Feather, Fish, PawPrint, Rabbit, Shell, Snail, Squirrel, Turtle];

// Literal class names so Tailwind keeps them.
const COLORS = [
  "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  "bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-200",
];

function hash(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function GeneratedAvatarFallback({ name, className }: { name: string; className?: string }) {
  const h = hash(name);
  const Icon = ICONS[h % ICONS.length];
  const color = COLORS[Math.floor(h / ICONS.length) % COLORS.length];
  return (
    <AvatarFallback className={cn(color, className)}>
      <Icon className="size-1/2" />
    </AvatarFallback>
  );
}
