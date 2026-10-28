import { cn } from "@/lib/utils"
import { PALETTES, type PaletteId } from "@/themes/palettes"

// Each swatch is drawn in its own palette, so it shows the colours of the current light or dark mode.
function ThemeSwatch({
  palette,
  label,
  checked,
  onSelect,
}: {
  palette: PaletteId
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      onClick={onSelect}
      className="group flex flex-col items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        data-theme={palette}
        className={cn(
          "flex h-10 w-[60px] items-center justify-center gap-1 rounded-md bg-background",
          checked ? "border-2 border-primary" : "border border-border group-hover:tint"
        )}
      >
        <span className="size-2.5 rounded-full bg-primary" />
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="size-2.5 rounded-full border border-border bg-card" />
      </span>
      <span className={cn("text-xs", checked ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
    </button>
  )
}

function ThemeSwatchGroup({
  value,
  onChange,
  className,
  ...props
}: {
  value: PaletteId
  onChange: (palette: PaletteId) => void
  className?: string
} & ({ "aria-label": string } | { "aria-labelledby": string })) {
  return (
    <div role="radiogroup" className={cn("flex flex-wrap gap-3", className)} {...props}>
      {PALETTES.map((p) => (
        <ThemeSwatch key={p.id} palette={p.id} label={p.label} checked={p.id === value} onSelect={() => onChange(p.id)} />
      ))}
    </div>
  )
}

export { ThemeSwatch, ThemeSwatchGroup }
