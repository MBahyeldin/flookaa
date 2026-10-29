import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// How far below the viewport top a section's top must pass to count as being read (under the sticky nav).
const READ_LINE = 140;

type SpyOptions = {
  /** The scrolling element when it isn't the page, e.g. a sheet; lines are measured from its top. */
  root?: RefObject<HTMLElement | null>;
  /** False keeps jumps out of the URL hash. */
  hash?: boolean;
};

/** Section nav as jump links: the active id follows scrolling, and `jump` scrolls to a section and keeps it in the hash. */
export function useSectionSpy<T extends string>(ids: readonly T[], ready: boolean, { root, hash: useHash = true }: SpyOptions = {}) {
  const [active, setActive] = useState<T>(ids[0]);
  const location = useLocation();
  const navigate = useNavigate();
  // A jump's smooth scroll passes other sections and may stop short at the page end; keep the clicked one.
  const lockedUntil = useRef(0);

  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockedUntil.current) return;
      const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
      if (els.length === 0) return;
      const box = root?.current?.getBoundingClientRect();
      const top = box?.top ?? 0;
      const bottom = box?.bottom ?? window.innerHeight;
      const last = els[els.length - 1];
      // At the end of the page a short last section never reaches the line, so it wins once fully in view.
      if (last.getBoundingClientRect().bottom <= bottom + 2) {
        setActive(last.id as T);
        return;
      }
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= top + READ_LINE) current = el.id;
      setActive(current as T);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Capture, so it hears whichever element scrolls the page.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids, ready, root]);

  const jump = useCallback(
    (id: T) => {
      setActive(id);
      lockedUntil.current = Date.now() + 1000;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (useHash) navigate({ search: location.search, hash: id }, { replace: true });
    },
    [navigate, location.search, useHash],
  );

  // A shared #section link lands there once the page has content.
  const hash = location.hash.slice(1) as T;
  useEffect(() => {
    if (useHash && ready && ids.includes(hash)) {
      setActive(hash);
      lockedUntil.current = Date.now() + 1000;
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    }
    // Only on first render of the content, not on every hash change from `jump`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return [active, jump] as const;
}
