import type { ReactNode, RefObject } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useMobile";

type Measurable = { getBoundingClientRect(): DOMRect };

// Bottom sheet on mobile, popover on desktop: the one container for picking,
// inserting and editing blocks.
export function BlockSurface(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onBack?: () => void;
  // Either a trigger element the popover sits on, or something to measure.
  trigger?: ReactNode;
  anchor?: RefObject<Measurable | null>;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  const header = (
    <div className="flex items-center gap-1">
      {props.onBack ? (
        <Button
          variant="ghost"
          size="icon"
          className="max-md:size-11"
          aria-label="Back"
          onClick={props.onBack}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
      ) : null}
      <span className="font-semibold">{props.title}</span>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        {props.trigger ? (
          <SheetTrigger asChild>{props.trigger}</SheetTrigger>
        ) : null}
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pr-14">
            <SheetTitle asChild>{header}</SheetTitle>
            <SheetDescription className="sr-only">
              {props.title}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4">{props.children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      {props.trigger ? (
        <PopoverTrigger asChild>{props.trigger}</PopoverTrigger>
      ) : (
        <PopoverAnchor virtualRef={props.anchor as RefObject<Measurable>} />
      )}
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="flex max-h-[70vh] w-80 flex-col gap-3 overflow-y-auto p-3"
      >
        {header}
        {props.children}
      </PopoverContent>
    </Popover>
  );
}
