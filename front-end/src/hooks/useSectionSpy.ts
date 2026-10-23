import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Section nav as jump links: the active id follows scrolling, and `jump` scrolls to a section and keeps it in the hash. */
export function useSectionSpy<T extends string>(ids: readonly T[], ready: boolean) {
  const [active, setActive] = useState<T>(ids[0]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    const visible = new Set<string>();
    // Only the band under the sticky nav counts, so the active tab is the section being read.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids, ready]);

  const jump = useCallback(
    (id: T) => {
      setActive(id);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      navigate({ search: location.search, hash: id }, { replace: true });
    },
    [navigate, location.search],
  );

  // A shared #section link lands there once the page has content.
  const hash = location.hash.slice(1) as T;
  useEffect(() => {
    if (ready && ids.includes(hash)) {
      setActive(hash);
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    }
    // Only on first render of the content, not on every hash change from `jump`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return [active, jump] as const;
}
