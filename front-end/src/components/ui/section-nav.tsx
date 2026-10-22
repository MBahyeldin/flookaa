import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const SectionNav = TabsPrimitive.Root

function SectionNavList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="section-nav"
      className={cn(
        "bg-background sticky top-0 z-10 flex gap-7 overflow-x-auto border-b px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SectionNavTab({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="section-nav-tab"
      className={cn(
        "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground relative shrink-0 cursor-pointer pt-3 pb-3 text-sm font-medium whitespace-nowrap outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full data-[state=active]:after:bg-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

const SectionNavContent = TabsPrimitive.Content

export { SectionNav, SectionNavList, SectionNavTab, SectionNavContent }
