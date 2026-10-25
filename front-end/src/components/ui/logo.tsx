import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const logoVariants = cva(
  "bg-primary text-primary-foreground relative flex shrink-0 items-center justify-center overflow-hidden font-semibold",
  {
    variants: {
      size: {
        sm: "size-8 rounded-sm text-sm",
        md: "size-12 rounded-md text-lg",
        lg: "size-20 rounded-lg border-3 border-card text-3xl",
        xl: "size-28 rounded-lg border-3 border-card text-4xl",
      },
    },
    defaultVariants: { size: "md" },
  }
)

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join("")
    .toUpperCase()
}

function Logo({
  name,
  src,
  size,
  className,
}: VariantProps<typeof logoVariants> & { name: string; src?: string | null; className?: string }) {
  return (
    <span data-slot="logo" className={cn(logoVariants({ size }), className)}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <span aria-hidden>{initials(name)}</span>}
    </span>
  )
}

export { Logo, logoVariants, initials }
