import { useMemo, useRef, type ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { SectionNav, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useSectionSpy } from "@/hooks/useSectionSpy";
import type { PaletteId } from "@/themes/palettes";

export type ManageSection<T extends string> = { id: T; label: string };

/** Settings-style sheet in the entity's palette: header, jump links, then one SettingsSection per entry. */
export function ManageSheet<T extends string>({
  open,
  onOpenChange,
  theme,
  name,
  logo,
  sections,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: PaletteId;
  name: string;
  logo: string;
  sections: readonly ManageSection<T>[];
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const key = sections.map((s) => s.id).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ids = useMemo(() => sections.map((s) => s.id), [key]);
  const [active, jump] = useSectionSpy(ids, open, { root: scroller, hash: false });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-[640px]">
        <div data-theme={theme} className="flex h-full min-h-0 flex-col bg-background text-foreground">
          <div className="flex items-center gap-3 border-b px-4 py-3 md:px-6">
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="sm:hidden">
                <ArrowLeft />
              </Button>
            </SheetClose>
            <Logo name={name} src={logo || null} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col">
              <SheetDescription className="text-overline text-muted-foreground">Manage</SheetDescription>
              <SheetTitle className="truncate text-h4 font-semibold">{name}</SheetTitle>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="hidden sm:inline-flex">
                <X />
              </Button>
            </SheetClose>
          </div>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
            <SectionNav value={active} onValueChange={(v) => jump(v as T)}>
              <SectionNavList className="px-4 md:px-6">
                {sections.map((s) => (
                  <SectionNavTab key={s.id} value={s.id}>
                    {s.label}
                  </SectionNavTab>
                ))}
              </SectionNavList>
            </SectionNav>
            <div className="flex flex-col gap-6 px-4 py-6 md:px-6">{children}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
