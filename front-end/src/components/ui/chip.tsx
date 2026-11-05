import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color] outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      kind: {
        interest: "bg-muted border-border text-foreground data-[selected=true]:bg-accent data-[selected=true]:border-primary",
        filter: "border-border text-foreground data-[selected=true]:bg-foreground data-[selected=true]:border-foreground data-[selected=true]:text-background",
      },
      size: {
        default: "px-3 py-1.5 text-sm",
        sm: "px-2.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      kind: "interest",
      size: "default",
    },
  }
)

type ChipProps = VariantProps<typeof chipVariants> & {
  emoji?: string
  selected?: boolean
  className?: string
  children: React.ReactNode
}

function Chip({
  kind,
  size,
  emoji,
  selected,
  className,
  children,
  ...props
}: ChipProps & Omit<React.ComponentProps<"button">, keyof ChipProps>) {
  const content = (
    <>
      {emoji && (
        <span aria-hidden className="font-normal">
          {emoji}
        </span>
      )}
      {children}
    </>
  )
  const classes = cn(chipVariants({ kind, size }), className)

  if (!props.onClick) {
    return (
      <span data-slot="chip" data-selected={selected || undefined} className={classes}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-slot="chip"
      data-selected={selected || undefined}
      aria-pressed={selected}
      className={cn(classes, "cursor-pointer hover:tint disabled:pointer-events-none disabled:opacity-50")}
      {...props}
    >
      {content}
    </button>
  )
}

export { Chip, chipVariants }
