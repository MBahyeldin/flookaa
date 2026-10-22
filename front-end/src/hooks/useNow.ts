import { useEffect, useState } from "react";

// One timer for every mounted clock, aligned to the second and paused while the tab is hidden.
const listeners = new Set<() => void>();
let timer: number | undefined;
let watchingVisibility = false;

function tick() {
  timer = undefined;
  listeners.forEach((listener) => listener());
  sync();
}

function sync() {
  const run = listeners.size > 0 && document.visibilityState === "visible";
  if (run && timer === undefined) {
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
  } else if (!run && timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") listeners.forEach((listener) => listener());
  sync();
}

// Current time in ms, refreshed every second until it reaches `until`.
export function useNow(until = Infinity) {
  const [now, setNow] = useState(Date.now);
  const active = now < until;

  useEffect(() => {
    if (!active) return;
    if (!watchingVisibility) {
      document.addEventListener("visibilitychange", onVisibilityChange);
      watchingVisibility = true;
    }
    const listener = () => setNow(Date.now());
    listeners.add(listener);
    sync();
    return () => {
      listeners.delete(listener);
      sync();
    };
  }, [active]);

  return now;
}
