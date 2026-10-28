import { Cover } from "@/components/cover"
import { cn } from "@/lib/utils"
import type { CoverPattern } from "@/types/cover"

export const COVER_PATTERNS: { id: CoverPattern; label: string }[] = [
  { id: "horizon", label: "Horizon" },
  { id: "waves", label: "Waves" },
  { id: "hills", label: "Hills" },
  { id: "stripes", label: "Stripes" },
]

function CoverOption({
  pattern,
  label,
  checked,
  onSelect,
}: {
  pattern: CoverPattern
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className="group flex flex-col items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "block h-10 w-[92px] overflow-hidden rounded-md",
          checked ? "border-2 border-primary" : "border border-border group-hover:opacity-90"
        )}
      >
        <Cover pattern={pattern} />
      </span>
      <span className={cn("text-xs", checked ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
    </button>
  )
}

function CoverOptionGroup({
  value,
  onChange,
  className,
  ...props
}: {
  value: CoverPattern
  onChange: (pattern: CoverPattern) => void
  className?: string
} & ({ "aria-label": string } | { "aria-labelledby": string })) {
  return (
    <div role="radiogroup" className={cn("flex flex-wrap gap-3", className)} {...props}>
      {COVER_PATTERNS.map((p) => (
        <CoverOption key={p.id} pattern={p.id} label={p.label} checked={p.id === value} onSelect={() => onChange(p.id)} />
      ))}
    </div>
  )
}

export { CoverOption, CoverOptionGroup }
