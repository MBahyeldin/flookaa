import { useEffect, useRef, useState } from "react";

/**
 * Tracks which items appeared in a list *after* its first render.
 *
 * Comments and replies arrive over the websocket into the store, so a list can
 * grow at any time. Anything present on the initial render is existing history
 * and must not animate — otherwise the whole thread would flash on mount.
 *
 * Ids are cleared again shortly after so the animation plays once rather than
 * replaying on every later re-render.
 */
export default function useNewlyAdded(
  ids: string[],
  { clearAfterMs = 2200, maxBatchSize = 1 }: {
    clearAfterMs?: number;
    /**
     * Largest group still treated as "arrived live". Anything bigger is a bulk
     * load — the initial fetch, or a "load more" page — and is recorded as
     * history without animating.
     */
    maxBatchSize?: number;
  } = {}
): Set<string> {
  const seenRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

  // `ids` is a fresh array each render; join to a primitive so the effect keys
  // on the actual membership rather than array identity.
  const idsKey = ids.join("|");

  useEffect(() => {
    const current = idsKey ? idsKey.split("|") : [];
    const fresh = current.filter((id) => !seenRef.current.has(id));
    if (fresh.length === 0) return;

    fresh.forEach((id) => seenRef.current.add(id));

    /*
     * Batch size is what separates "a comment just arrived" from "the thread
     * just loaded". Seeding the baseline on first render instead doesn't work:
     * the list is still empty while the query is in flight, so the whole thread
     * would land afterwards and every comment would flash at once.
     */
    if (fresh.length > maxBatchSize) return;

    setNewIds(new Set(fresh));
  }, [idsKey, maxBatchSize]);

  useEffect(() => {
    if (newIds.size === 0) return;
    const timer = setTimeout(() => setNewIds(new Set()), clearAfterMs);
    return () => clearTimeout(timer);
  }, [newIds, clearAfterMs]);

  return newIds;
}
