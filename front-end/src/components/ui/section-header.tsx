import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const seeAllClass =
  "flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"

function SectionHeader({
  overline,
  title,
  seeAllTo,
  onSeeAll,
  seeAllLabel = "See all",
  className,
}: {
  overline?: React.ReactNode
  title: React.ReactNode
  seeAllTo?: string
  onSeeAll?: () => void
  seeAllLabel?: string
  className?: string
}) {
  return (
    <div data-slot="section-header" className={cn("flex items-end gap-4", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {overline && <p className="text-overline font-semibold text-primary uppercase">{overline}</p>}
        <h2>{title}</h2>
      </div>
      {seeAllTo ? (
        <Link to={seeAllTo} className={seeAllClass}>
          {seeAllLabel}
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Link>
      ) : onSeeAll ? (
        <button type="button" onClick={onSeeAll} className={cn(seeAllClass, "cursor-pointer")}>
          {seeAllLabel}
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
      ) : null}
    </div>
  )
}

export { SectionHeader }
