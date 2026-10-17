import { useEffect, useRef } from "react";
import type { Editor } from "@portabletext/editor";
import { blocks, fromFormValue, type AnyBlock } from "../blocks";
import { categoryTitle, type BlockCategory } from "../blocks/defineBlock";
import { cn } from "@/lib/utils";

export function insertableBlocks(): AnyBlock[] {
  return blocks;
}

export function matchBlocks(query: string): AnyBlock[] {
  const q = query.toLowerCase();
  const all = insertableBlocks();
  if (!q) return all;
  const prefix = all.filter(
    (b) => b.title.toLowerCase().startsWith(q) || b.name.startsWith(q),
  );
  const rest = all.filter(
    (b) =>
      !prefix.includes(b) &&
      (b.title.toLowerCase().includes(q) || b.name.includes(q)),
  );
  return [...prefix, ...rest];
}

export function insertBlock(
  editor: Editor,
  block: AnyBlock,
  value: Record<string, unknown>,
) {
  editor.send({
    type: "insert.block object",
    blockObject: { name: block.name, value: fromFormValue(block, value) },
    placement: "auto",
  });
  editor.send({ type: "focus" });
}

export function BlockGrid(props: { onPick: (block: AnyBlock) => void }) {
  const groups = new Map<BlockCategory, AnyBlock[]>();
  for (const block of insertableBlocks()) {
    groups.set(block.category, [...(groups.get(block.category) ?? []), block]);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...groups].map(([category, list]) => (
        <section key={category} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {categoryTitle[category]}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {list.map((block) => (
              <button
                key={block.name}
                type="button"
                onClick={() => props.onPick(block)}
                className="flex min-h-11 flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left text-card-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <block.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{block.title}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {block.description}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function BlockList(props: {
  blocks: AnyBlock[];
  activeIndex: number;
  onActiveIndex: (index: number) => void;
  onPick: (block: AnyBlock) => void;
  // The slash menu keeps the caret in the editor while picking.
  keepFocus?: boolean;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${props.activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [props.activeIndex]);

  if (props.blocks.length === 0) {
    return (
      <p className="px-2 py-1.5 text-sm text-muted-foreground">
        No blocks match
      </p>
    );
  }

  return (
    <ul ref={listRef} role="listbox" className="flex flex-col gap-0.5">
      {props.blocks.map((block, index) => (
        <li
          key={block.name}
          role="option"
          aria-selected={index === props.activeIndex}
          data-index={index}
          onMouseDown={props.keepFocus ? (e) => e.preventDefault() : undefined}
          onMouseEnter={() => props.onActiveIndex(index)}
          onClick={() => props.onPick(block)}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 max-md:min-h-11",
            index === props.activeIndex && "bg-accent text-accent-foreground",
          )}
        >
          <block.icon className="size-4 shrink-0 text-primary" />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">{block.title}</span>
            <span className="truncate text-xs text-muted-foreground">
              {block.description}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// A new tab, so the draft in the composer stays.
export function BlocksGalleryLink() {
  return (
    <a
      href="/blocks"
      target="_blank"
      rel="noopener"
      className="mt-3 block rounded-md px-2 py-1.5 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 max-md:py-3"
    >
      See all blocks
    </a>
  );
}

export function listKeyDown(
  key: string,
  count: number,
  activeIndex: number,
): number | "pick" | null {
  if (key === "ArrowDown") return count ? (activeIndex + 1) % count : 0;
  if (key === "ArrowUp") return count ? (activeIndex - 1 + count) % count : 0;
  if (key === "Enter") return count ? "pick" : null;
  return null;
}
