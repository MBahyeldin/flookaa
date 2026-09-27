import * as React from "react"

const EDGE_ZONE = 24 // px from the screen edge where an open-swipe may start
const INTENT_SLOP = 10 // px of movement before deciding horizontal vs vertical
const FLING_VELOCITY = 0.4 // px/ms; a quick flick settles regardless of distance
const SETTLE_MS = 200
const FALLBACK_WIDTH = 288

type Drag = {
  mode: "opening" | "closing"
  startX: number
  startY: number
  lastX: number
  lastT: number
  velocity: number
  visible: number
  locked: boolean
}

/**
 * Finger-tracking swipe for the mobile sidebar sheet: swipe in from the
 * sidebar's screen edge to drag it open, swipe back the other way to drag it
 * closed. Position is written straight to the DOM so touchmove never re-renders.
 */
export function useSidebarSwipe({
  enabled,
  side,
  open,
  setOpen,
}: {
  enabled: boolean
  side: "left" | "right"
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const sign = side === "left" ? 1 : -1
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const drag = React.useRef<Drag | null>(null)
  const openRef = React.useRef(open)
  // While a drag opens the sheet, its slide-in animation would fight the finger.
  const [suppressAnimation, setSuppressAnimation] = React.useState(false)

  React.useEffect(() => {
    openRef.current = open
    if (!open) setSuppressAnimation(false)
  }, [open])

  const getOverlay = () =>
    document.querySelector<HTMLElement>(
      '[data-slot="sheet-overlay"][data-state="open"]'
    )

  const apply = React.useCallback(
    (visible: number) => {
      const el = contentRef.current
      if (!el) return
      const width = el.offsetWidth || FALLBACK_WIDTH
      el.style.transition = "none"
      el.style.transform = `translateX(${sign * (visible - width)}px)`
      const overlay = getOverlay()
      if (overlay) {
        overlay.style.transition = "none"
        overlay.style.opacity = String(visible / width)
      }
    },
    [sign]
  )

  const settle = React.useCallback(
    (toOpen: boolean) => {
      const el = contentRef.current
      if (!toOpen) {
        // The exit animation starts from the inline transform, so it
        // continues from wherever the finger let go.
        setOpen(false)
        return
      }
      if (!el) {
        // Released before the sheet mounted: let the normal slide-in play.
        setSuppressAnimation(false)
        return
      }
      const overlay = getOverlay()
      el.style.transition = `transform ${SETTLE_MS}ms ease-out`
      el.style.transform = ""
      if (overlay) {
        overlay.style.transition = `opacity ${SETTLE_MS}ms ease-out`
        overlay.style.opacity = ""
      }
      window.setTimeout(() => {
        el.style.transition = ""
        if (overlay) overlay.style.transition = ""
      }, SETTLE_MS)
    },
    [setOpen]
  )

  const setContentRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      contentRef.current = el
      // The sheet mounts a frame after an open-swipe starts; catch it up.
      if (el && drag.current?.locked) apply(drag.current.visible)
    },
    [apply]
  )

  React.useEffect(() => {
    if (!enabled) return

    const onStart = (e: TouchEvent) => {
      drag.current = null
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      if (!openRef.current) {
        const fromEdge = side === "left" ? t.clientX : window.innerWidth - t.clientX
        if (fromEdge > EDGE_ZONE) return
      }
      drag.current = {
        mode: openRef.current ? "closing" : "opening",
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastT: e.timeStamp,
        velocity: 0,
        visible: openRef.current ? (contentRef.current?.offsetWidth ?? FALLBACK_WIDTH) : 0,
        locked: false,
      }
    }

    const onMove = (e: TouchEvent) => {
      const d = drag.current
      if (!d) return
      const t = e.touches[0]
      const dx = t.clientX - d.startX
      const dy = t.clientY - d.startY

      if (!d.locked) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < INTENT_SLOP) return
        const towardOpen = sign * dx > 0
        const horizontal = Math.abs(dx) > Math.abs(dy)
        if (!horizontal || towardOpen !== (d.mode === "opening")) {
          drag.current = null // vertical scroll or wrong direction: not ours
          return
        }
        d.locked = true
        if (d.mode === "opening") {
          setSuppressAnimation(true)
          setOpen(true)
        }
      }

      if (e.cancelable) e.preventDefault()
      const dt = e.timeStamp - d.lastT
      if (dt > 0) d.velocity = (t.clientX - d.lastX) / dt
      d.lastX = t.clientX
      d.lastT = e.timeStamp

      const width = contentRef.current?.offsetWidth || FALLBACK_WIDTH
      const travel = d.mode === "opening" ? sign * dx : width + sign * dx
      d.visible = Math.min(Math.max(travel, 0), width)
      apply(d.visible)
    }

    const onEnd = () => {
      const d = drag.current
      drag.current = null
      if (!d?.locked) return
      const width = contentRef.current?.offsetWidth || FALLBACK_WIDTH
      const velocityTowardOpen = sign * d.velocity
      const toOpen =
        Math.abs(velocityTowardOpen) > FLING_VELOCITY
          ? velocityTowardOpen > 0
          : d.visible > width / 2
      settle(toOpen)
    }

    document.addEventListener("touchstart", onStart, { passive: true })
    document.addEventListener("touchmove", onMove, { passive: false })
    document.addEventListener("touchend", onEnd)
    document.addEventListener("touchcancel", onEnd)
    return () => {
      document.removeEventListener("touchstart", onStart)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onEnd)
      document.removeEventListener("touchcancel", onEnd)
    }
  }, [enabled, side, sign, setOpen, apply, settle])

  return { contentRef: setContentRef, suppressAnimation: suppressAnimation && open }
}
