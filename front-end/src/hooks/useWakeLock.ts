import { useEffect } from "react"

/**
 * Keeps the device screen on while the site is open, via the Screen Wake Lock
 * API. The browser drops the lock whenever the tab is hidden (switching apps,
 * locking the phone), so it's re-requested each time the page becomes visible.
 *
 * Some browsers (notably Safari) refuse the request until the user has
 * interacted with the page, so a failed attempt retries on the next tap/key.
 * Unsupported browsers and insecure (http) origins are a silent no-op.
 */
export default function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let disposed = false

    const retryOnInteraction = () => {
      document.addEventListener("pointerdown", request, { once: true })
      document.addEventListener("keydown", request, { once: true })
    }

    async function request() {
      if (disposed || document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return
      try {
        const lock = await navigator.wakeLock.request("screen")
        if (disposed) {
          void lock.release()
          return
        }
        sentinel = lock
      } catch {
        // NotAllowedError: no user activation yet, battery saver, or policy.
        retryOnInteraction()
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void request()
    }

    void request()
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", onVisibilityChange)
      document.removeEventListener("pointerdown", request)
      document.removeEventListener("keydown", request)
      void sentinel?.release()
    }
  }, [])
}
