import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionNav, SectionNavContent, SectionNavList, SectionNavTab } from "@/components/ui/section-nav";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { PaletteId } from "@/themes/palettes";

export type MembersSheetTab<T extends string> = {
  id: T;
  label: string;
  /** Shorter label below `sm`. */
  short?: string;
  count?: number;
  content: ReactNode;
};

export function MembersSheetFrame<T extends string>({
  open,
  onClose,
  theme,
  title,
  description,
  tabs,
  tab,
  onTabChange,
}: {
  open: boolean;
  onClose: () => void;
  theme: PaletteId;
  title: string;
  description: string;
  tabs: MembersSheetTab<T>[];
  tab: T;
  onTabChange: (tab: T) => void;
}) {
  const single = tabs.length === 1;
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-[480px]">
        <div data-theme={theme} className="flex h-full min-h-0 flex-col bg-background text-foreground">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-6">
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="sm:hidden">
                <ArrowLeft />
              </Button>
            </SheetClose>
            <div className="flex min-w-0 flex-1 flex-col">
              <SheetTitle className="text-h4 font-semibold">{title}</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">{description}</SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="hidden sm:inline-flex">
                <X />
              </Button>
            </SheetClose>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {single ? (
              <div className="px-4 pb-6 md:px-6">{tabs[0].content}</div>
            ) : (
              <SectionNav value={tab} onValueChange={(v) => onTabChange(v as T)}>
                <SectionNavList className="px-4 md:px-6">
                  {tabs.map((t) => (
                    <SectionNavTab key={t.id} value={t.id} className="inline-flex items-center gap-1.5">
                      {t.short ? (
                        <>
                          <span className="sm:hidden">{t.short}</span>
                          <span className="hidden sm:inline">{t.label}</span>
                        </>
                      ) : (
                        t.label
                      )}
                      {!!t.count && <Badge variant="count">{t.count}</Badge>}
                    </SectionNavTab>
                  ))}
                </SectionNavList>
                {tabs.map((t) => (
                  <SectionNavContent key={t.id} value={t.id} className="px-4 pb-6 md:px-6">
                    {t.content}
                  </SectionNavContent>
                ))}
              </SectionNav>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
