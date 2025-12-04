/* eslint-disable @typescript-eslint/no-explicit-any */
import { tv, type ClassProp } from "tailwind-variants";
import {
  PopoverContent,
  Popover as ShadPopover,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ClassNameValue } from "tailwind-merge";

const styles = tv({
  base: "bg-white z-50 forced-colors:bg-[Canvas] shadow-2xl rounded-xl bg-clip-padding border border-black/10 text-slate-700",
  variants: {
    isEntering: {
      true: "animate-in fade-in placement-bottom:slide-in-from-top-1 placement-top:slide-in-from-bottom-1 placement-left:slide-in-from-right-1 placement-right:slide-in-from-left-1 ease-out duration-200",
    },
    isExiting: {
      true: "animate-out fade-out placement-bottom:slide-out-to-top-1 placement-top:slide-out-to-bottom-1 placement-left:slide-out-to-right-1 placement-right:slide-out-to-left-1 ease-in duration-150",
    },
  },
});

export function Popover({ children, className, ...props }: any) {
  return (
    <ShadPopover
      offset={8}
      {...props}
      className={cn(
        className,
        (
          className: any,
          renderProps:
            | ({
                isEntering?: boolean | undefined;
                isExiting?: boolean | undefined;
              } & ClassProp<ClassNameValue>)
            | undefined
        ) => styles({ ...renderProps, className })
      )}
    >
      <PopoverContent>{children}</PopoverContent>
    </ShadPopover>
  );
}
