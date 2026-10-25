import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const GAP = 16;

function columnsFor(width: number) {
  if (width >= 960) return 4;
  if (width >= 480) return 2;
  return 1;
}

/**
 * Columns filled in order, each item into the shortest column, so appending
 * never moves items already placed. A column-count change re-deals everything.
 */
export function Masonry<T>({
  items,
  getKey,
  estimateHeight,
  render,
}: {
  items: T[];
  getKey: (item: T) => string;
  estimateHeight: (item: T) => number;
  render: (item: T) => ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(0);
  const heights = useRef(new Map<string, number>());
  const placed = useRef<{ columns: number; byKey: Map<string, number> }>({ columns: 0, byKey: new Map() });

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const update = () => setColumns(columnsFor(el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Heights only steer where later items go, so measuring doesn't re-render.
  const itemObserver = useRef<ResizeObserver | null>(null);
  useEffect(() => () => itemObserver.current?.disconnect(), []);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    itemObserver.current ??= new ResizeObserver((entries) => {
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.masonryKey;
        if (key) heights.current.set(key, entry.contentRect.height);
      }
    });
    itemObserver.current.observe(el);
  }, []);

  if (placed.current.columns !== columns) placed.current = { columns, byKey: new Map() };
  const lists: T[][] = Array.from({ length: columns }, () => []);
  const totals = new Array<number>(columns).fill(0);
  for (const item of columns ? items : []) {
    const key = getKey(item);
    let column = placed.current.byKey.get(key);
    if (column === undefined) {
      column = totals.indexOf(Math.min(...totals));
      placed.current.byKey.set(key, column);
    }
    lists[column].push(item);
    totals[column] += (heights.current.get(key) ?? estimateHeight(item)) + GAP;
  }

  return (
    <div ref={container} className="flex items-start gap-4">
      {lists.map((list, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-4">
          {list.map((item) => {
            const key = getKey(item);
            return (
              <div key={key} ref={measure} data-masonry-key={key}>
                {render(item)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
