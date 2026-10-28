import { useMemo, type ReactNode } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { SectionNav, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { useSectionSpy } from "@/hooks/useSectionSpy";
import { cn } from "@/lib/utils";

export type SettingsNavItem<T extends string> = { id: T; label: string };

const column = "mx-auto flex w-full max-w-[672px] flex-col px-4 py-8 md:py-12";

export function SettingsPage<T extends string>({
  header,
  sections,
  children,
  className,
}: {
  header: ReactNode;
  sections: readonly SettingsNavItem<T>[];
  children: ReactNode;
  className?: string;
}) {
  const key = sections.map((s) => s.id).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ids = useMemo(() => sections.map((s) => s.id), [key]);
  const [active, jump] = useSectionSpy(ids, true);

  return (
    <div className={cn(column, "gap-6", className)}>
      {header}
      <SectionNav value={active} onValueChange={(v) => jump(v as T)} className="sticky top-14 z-10 bg-background md:top-0">
        <SectionNavList className="static px-0">
          {sections.map((s) => (
            <SectionNavTab key={s.id} value={s.id}>
              {s.label}
            </SectionNavTab>
          ))}
        </SectionNavList>
      </SectionNav>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

export function SettingsHeader({ title, lead }: { title: ReactNode; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-h1 font-semibold tracking-tight">{title}</h1>
      {lead && <p className="text-muted-foreground">{lead}</p>}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className={cn(column, "gap-6")} aria-busy="true" aria-label="Loading settings">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-lg border bg-card p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64 max-w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsError({ title, onRetry }: { title: string; onRetry: () => unknown }) {
  return (
    <div className={column}>
      <ErrorState title={title} onRetry={onRetry} />
    </div>
  );
}
