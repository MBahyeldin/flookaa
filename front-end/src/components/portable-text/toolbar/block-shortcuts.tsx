import { useRef, useState } from "react";
import { useEditor } from "@portabletext/editor";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { blockByName, toFormValue, type AnyBlock } from "../blocks";
import { BlockSurface } from "./block-surface";
import { ObjectForm } from "./object-form";
import {
  BlockGrid,
  BlockList,
  BlocksGalleryLink,
  insertBlock,
  insertableBlocks,
  listKeyDown,
} from "./block-picker";

const shortcuts = ["image", "voiceNote", "checklist", "steps"];
// Phones keep what fits in one row; the rest is in the "More blocks" grid.
const mobileShortcuts = ["image"];
const shortLabel: Record<string, string> = { voiceNote: "Voice" };

export function BlockShortcuts(props: { initialBlock?: string }) {
  const editor = useEditor();
  const isMobile = useIsMobile();
  const [picked, setPicked] = useState<AnyBlock | null>(() =>
    props.initialBlock ? (blockByName(props.initialBlock) ?? null) : null,
  );
  const [open, setOpen] = useState(() => picked !== null);
  const [fromPicker, setFromPicker] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement | null>(null);
  const anchor = useRef({
    getBoundingClientRect: () =>
      (target.current ?? row.current)?.getBoundingClientRect() ?? new DOMRect(),
  });
  const list = insertableBlocks();
  const shortcutBlocks = (isMobile ? mobileShortcuts : shortcuts)
    .map((name) => blockByName(name))
    .filter((block): block is AnyBlock => !!block);

  const close = () => {
    setOpen(false);
    setPicked(null);
    setFromPicker(false);
    setActiveIndex(0);
  };

  const insert = (block: AnyBlock, value: Record<string, unknown>) => {
    insertBlock(editor, block, value);
    close();
  };

  const choose = (block: AnyBlock, viaPicker: boolean) => {
    if (block.fields.length === 0) {
      insert(block, { ...block.defaultValues });
      return;
    }
    setPicked(block);
    setFromPicker(viaPicker);
    setOpen(true);
  };

  return (
    <div
      ref={row}
      className="flex items-center gap-1 overflow-x-auto border-t border-border pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {shortcutBlocks.map((block) => (
        <Button
          key={block.name}
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 max-md:min-h-11"
          onClick={(e) => {
            target.current = e.currentTarget;
            choose(block, false);
          }}
        >
          <block.icon className="size-4" />
          {shortLabel[block.name] ?? block.title}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 max-md:min-h-11"
        onClick={(e) => {
          target.current = e.currentTarget;
          setPicked(null);
          setOpen(true);
        }}
      >
        <PlusIcon className="size-4" />
        More blocks
      </Button>

      <BlockSurface
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={picked ? picked.title : "Insert block"}
        onBack={picked && fromPicker ? () => setPicked(null) : undefined}
        anchor={anchor}
      >
        {picked ? (
          <ObjectForm
            key={picked.name}
            submitLabel="Insert"
            fields={picked.fields}
            defaultValues={toFormValue(picked, picked.defaultValues)}
            onSubmit={({ value }) => insert(picked, value)}
          />
        ) : isMobile ? (
          <>
            <BlockGrid onPick={(block) => choose(block, true)} />
            <BlocksGalleryLink />
          </>
        ) : (
          <div
            tabIndex={0}
            className="outline-none"
            onKeyDown={(e) => {
              const next = listKeyDown(e.key, list.length, activeIndex);
              if (next === null) return;
              e.preventDefault();
              if (next === "pick") choose(list[activeIndex], true);
              else setActiveIndex(next);
            }}
          >
            <BlockList
              blocks={list}
              activeIndex={activeIndex}
              onActiveIndex={setActiveIndex}
              onPick={(block) => choose(block, true)}
            />
            <BlocksGalleryLink />
          </div>
        )}
      </BlockSurface>
    </div>
  );
}
