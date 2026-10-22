import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function SectionHeader({
  overline,
  title,
  seeAllTo,
  seeAllLabel = "See all",
  className,
}: {
  overline?: React.ReactNode
  title: React.ReactNode
  seeAllTo?: string
  seeAllLabel?: string
  className?: string
}) {
  return (
    <div data-slot="section-header" className={cn("flex items-end gap-4", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {overline && <p className="text-overline font-semibold text-primary uppercase">{overline}</p>}
        <h2>{title}</h2>
      </div>
      {seeAllTo && (
        <Link
          to={seeAllTo}
          className="flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {seeAllLabel}
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Link>
      )}
    </div>
  )
}

export { SectionHeader }
