import { useState } from "react";
import { useEditor } from "@portabletext/editor";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { toFormValue, type AnyBlock } from "../blocks";
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

export function InsertBlockButton(props: { className?: string }) {
  const editor = useEditor();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<AnyBlock | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const list = insertableBlocks();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPicked(null);
      setActiveIndex(0);
    }
  };

  const pick = (block: AnyBlock) => {
    if (block.fields.length === 0) {
      insertBlock(editor, block, { ...block.defaultValues });
      onOpenChange(false);
      return;
    }
    setPicked(block);
  };

  return (
    <BlockSurface
      open={open}
      onOpenChange={onOpenChange}
      title={picked ? picked.title : "Insert block"}
      onBack={picked ? () => setPicked(null) : undefined}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className={props.className}
          aria-label="Insert block"
          title="Insert block"
        >
          <PlusIcon className="size-4" />
        </Button>
      }
    >
      {picked ? (
        <ObjectForm
          key={picked.name}
          submitLabel="Insert"
          fields={picked.fields}
          defaultValues={toFormValue(picked, picked.defaultValues)}
          onSubmit={({ value }) => {
            insertBlock(editor, picked, value);
            onOpenChange(false);
          }}
        />
      ) : isMobile ? (
        <>
          <BlockGrid onPick={pick} />
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
            if (next === "pick") pick(list[activeIndex]);
            else setActiveIndex(next);
          }}
        >
          <BlockList
            blocks={list}
            activeIndex={activeIndex}
            onActiveIndex={setActiveIndex}
            onPick={pick}
          />
          <BlocksGalleryLink />
        </div>
      )}
    </BlockSurface>
  );
}
