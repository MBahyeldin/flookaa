import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function RadioCardGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="radiogroup" data-slot="radio-card-group" className={cn("flex flex-col gap-3", className)} {...props} />
}

function RadioCard({
  icon: Icon,
  title,
  body,
  checked,
  onSelect,
  className,
}: {
  icon: LucideIcon
  title: React.ReactNode
  body: React.ReactNode
  checked: boolean
  onSelect: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-slot="radio-card"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "border-primary bg-accent" : "bg-card hover:tint",
        className
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{body}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary" : "border-muted-foreground/50"
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
    </button>
  )
}

export { RadioCardGroup, RadioCard }
