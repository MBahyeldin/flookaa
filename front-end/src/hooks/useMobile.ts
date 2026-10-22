import * as React from "react"

const MOBILE_BREAKPOINT = 768
const DESKTOP_BREAKPOINT = 1024

export type Breakpoint = "mobile" | "tablet" | "desktop"

function current(): Breakpoint {
  const w = window.innerWidth
  if (w < MOBILE_BREAKPOINT) return "mobile"
  return w < DESKTOP_BREAKPOINT ? "tablet" : "desktop"
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = React.useState<Breakpoint>(() =>
    typeof window === "undefined" ? "desktop" : current()
  )

  React.useEffect(() => {
    const queries = [MOBILE_BREAKPOINT, DESKTOP_BREAKPOINT].map((px) =>
      window.matchMedia(`(min-width: ${px}px)`)
    )
    const onChange = () => setBp(current())
    queries.forEach((q) => q.addEventListener("change", onChange))
    onChange()
    return () => queries.forEach((q) => q.removeEventListener("change", onChange))
  }, [])

  return bp
}

export function useIsMobile() {
  return useBreakpoint() === "mobile"
}
