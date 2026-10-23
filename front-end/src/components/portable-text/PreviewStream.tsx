import { PortableText, type PortableTextBlock, type PortableTextComponents } from "@portabletext/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { blockByName, blockSummary, type AnyBlock } from "./blocks";
import { breakBlock } from "./blocks/break";
import { blockIssues } from "./validateBlocks";

const GAP = 16;

export type PreviewTone = "card" | "accent";

export type PreviewOptions = {
  // The frame's surface: the fade blends into it and chips take the other one.
  tone: PreviewTone;
  // Canvas sets the opening paragraph in lead type.
  lead?: boolean;
  onTruncatedChange?: (truncated: boolean) => void;
};

type Unit = {
  key: string;
  value: PortableTextBlock[];
  list: boolean;
  block?: AnyBlock;
};

type Cut = {
  count: number;
  compactFirst: boolean;
  clipFirst: boolean;
  clamped: boolean;
};

// One unit per block object or text block; a run of list items stays one list.
function toUnits(value: PortableTextBlock[]): Unit[] {
  const units: Unit[] = [];
  value.forEach((item, index) => {
    const isText = item._type === "block";
    const listItem = isText && Boolean((item as { listItem?: string }).listItem);
    const prev = units[units.length - 1];
    if (listItem && prev?.list) {
      prev.value.push(item);
      return;
    }
    units.push({
      key: item._key ?? String(index),
      value: [item],
      list: listItem,
      block: isText ? undefined : blockByName(item._type),
    });
  });
  return units;
}

function fitCount(heights: number[], budget: number) {
  let used = 0;
  let count = 0;
  for (const height of heights) {
    const next = used + (count ? GAP : 0) + height;
    if (count > 0 && next > budget) break;
    used = next;
    count++;
  }
  return Math.max(count, 1);
}

function sameCut(a: Cut | null, b: Cut) {
  return (
    a !== null &&
    a.count === b.count &&
    a.compactFirst === b.compactFirst &&
    a.clipFirst === b.clipFirst &&
    a.clamped === b.clamped
  );
}

export default function PreviewStream({
  value,
  components,
  compactComponents,
  options,
}: {
  value: PortableTextBlock[];
  components: PortableTextComponents;
  compactComponents: PortableTextComponents;
  options: PreviewOptions;
}) {
  const budget = useIsMobile() ? 480 : 560;
  const units = useMemo(() => toUnits(value), [value]);
  const unitRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heights = useRef<number[]>([]);
  // After the reader touches the post, the cut stays put so nothing jumps.
  const frozen = useRef(false);
  const [cut, setCut] = useState<Cut | null>(null);

  const measure = useCallback(() => {
    if (frozen.current) return;
    unitRefs.current.length = units.length;
    heights.current.length = Math.min(heights.current.length, units.length);
    unitRefs.current.forEach((el, index) => {
      if (el && !el.hidden) heights.current[index] = el.scrollHeight;
    });
    if (heights.current.length < units.length) return;

    setCut((prev) => {
      const compactFirst = prev?.compactFirst ?? false;
      if (!compactFirst && heights.current[0] > budget) {
        return { count: 1, compactFirst: true, clipFirst: false, clamped: false };
      }
      const count = fitCount(heights.current, budget);
      const clamped = unitRefs.current
        .slice(0, count)
        .some((el) =>
          Array.from(el?.querySelectorAll<HTMLElement>("[data-clamp]") ?? []).some(
            (p) => p.scrollHeight > p.clientHeight + 1
          )
        );
      const next = { count, compactFirst, clipFirst: heights.current[0] > budget, clamped };
      return sameCut(prev, next) ? prev : next;
    });
  }, [budget, units.length]);

  useLayoutEffect(measure, [measure, cut?.compactFirst]);

  useEffect(() => {
    const observer = new ResizeObserver(() => measure());
    unitRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [measure, units]);

  const count = cut?.count ?? units.length;
  const hidden = units.slice(count);
  const truncated = hidden.length > 0 || Boolean(cut?.clamped || cut?.clipFirst);
  // A whole block needs no fade; only text running on or a clipped block does.
  const fade = Boolean(cut?.clipFirst) || (hidden.length > 0 && !units[count - 1]?.block);

  const { onTruncatedChange } = options;
  useEffect(() => {
    onTruncatedChange?.(truncated);
  }, [truncated, onTruncatedChange]);

  const chips = hidden.flatMap((unit) => {
    const block = unit.block;
    const item = unit.value[0];
    if (!block || block.name === breakBlock.name || blockIssues(block, item).length) return [];
    return [{ key: unit.key, block, label: blockSummary(block, item) }];
  });

  const freeze = () => {
    frozen.current = true;
  };

  return (
    <>
      <div className="relative space-y-4" onPointerDownCapture={freeze} onKeyDownCapture={freeze}>
        {units.map((unit, index) => {
          const first = index === 0;
          const leadParagraph =
            first && options.lead && !unit.block && !unit.list && unit.value[0].style === "normal";
          return (
            <div
              key={unit.key}
              ref={(el) => {
                unitRefs.current[index] = el;
              }}
              hidden={index >= count}
              className={cn(leadParagraph && "text-lead font-light", first && cut?.clipFirst && "overflow-hidden")}
              style={first && cut?.clipFirst ? { maxHeight: budget } : undefined}
            >
              <PortableText
                value={unit.value}
                components={first && cut?.compactFirst ? compactComponents : components}
              />
            </div>
          );
        })}
        {fade ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-b from-transparent",
              options.tone === "card" ? "to-card" : "to-accent"
            )}
          />
        ) : null}
      </div>
      {chips.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">+{chips.length} more inside</p>
          <ul className="flex flex-wrap gap-1.5">
            {chips.map(({ key, block, label }) => (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-1.5 rounded-full py-1 ps-2 pe-2.5 text-xs font-medium text-primary",
                  options.tone === "card" ? "bg-accent" : "bg-card"
                )}
              >
                <block.icon aria-hidden className="size-3.5" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
