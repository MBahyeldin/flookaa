import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"

function SegmentedControl({
  className,
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof ToggleGroupPrimitive.Root>, "type" | "value" | "onValueChange" | "defaultValue"> & {
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="segmented-control"
      type="single"
      value={value}
      // A segmented control always has one option on; clicking the selected one keeps it.
      onValueChange={(next) => next && onValueChange(next)}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-1", className)}
      {...props}
    />
  )
}

function SegmentedControlItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="segmented-control-item"
      className={cn(
        "h-8 rounded-md px-4 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:border data-[state=on]:border-border data-[state=on]:bg-card data-[state=on]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }
