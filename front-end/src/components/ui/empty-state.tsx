import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type StateBoxProps = {
  icon: LucideIcon
  iconClassName?: string
  title: React.ReactNode
  body?: React.ReactNode
  action?: React.ReactNode
  compact?: boolean
  className?: string
} & Omit<React.ComponentProps<"div">, "title">

function StateBox({ icon: Icon, iconClassName, title, body, action, compact, className, ...props }: StateBoxProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        compact ? "px-4 py-6" : "rounded-lg bg-surface-sunken px-8 py-10",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border bg-card",
          compact ? "size-10" : "size-12",
        )}
      >
        <Icon aria-hidden="true" className={cn(compact ? "size-[18px]" : "size-[22px]", iconClassName)} />
      </div>
      <p className="text-h4 font-medium text-foreground">{title}</p>
      {body && <p className="max-w-[296px] text-sm text-muted-foreground">{body}</p>}
      {action}
    </div>
  )
}

function EmptyState(props: Omit<StateBoxProps, "iconClassName">) {
  return <StateBox data-slot="empty-state" iconClassName="text-primary" {...props} />
}

export { EmptyState, StateBox }
