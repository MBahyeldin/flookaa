import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const monthYear = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export const overlineClass = "text-overline font-semibold tracking-wider text-muted-foreground uppercase";

export function AboutBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-lg bg-surface-sunken p-6", className)}>
      <h2 className={overlineClass}>About</h2>
      {children}
    </section>
  );
}

export function AboutFacts({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-2 text-sm">{children}</ul>;
}

export function AboutFact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="size-4 shrink-0" />
      {children}
    </li>
  );
}
