import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-sm", className)}
      {...props}
    />
  )
}

function SkeletonPost({ className }: { className?: string }) {
  return (
    <div data-slot="skeleton-post" className={cn("flex flex-col gap-3 rounded-lg border bg-card p-5", className)}>
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-2.5 w-30" />
          <Skeleton className="h-2.5 w-18" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-[94%]" />
      <Skeleton className="h-3 w-[56%]" />
    </div>
  )
}

function SkeletonRow({ className }: { className?: string }) {
  return (
    <div data-slot="skeleton-row" className={cn("flex gap-3 py-3", className)}>
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-2.5 w-25" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-14" />
      </div>
    </div>
  )
}

/** Announces loading once for a group of skeletons. */
function SkeletonList({
  count,
  variant = "row",
  className,
}: {
  count: number
  variant?: "row" | "post"
  className?: string
}) {
  const Item = variant === "post" ? SkeletonPost : SkeletonRow
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonPost, SkeletonRow, SkeletonList }
