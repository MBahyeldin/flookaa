import { useBlockObjectPopover } from "@portabletext/toolbar";
import type { ToolbarBlockObjectSchemaType } from "@portabletext/toolbar";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { blockByName, fromFormValue, toFormValue } from "../blocks";
import { BlockSurface } from "./block-surface";
import { ObjectForm } from "./object-form";

export function BlockObjectPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarBlockObjectSchemaType>;
}) {
  const blockObjectPopover = useBlockObjectPopover(props);
  const blockObject = blockObjectPopover.snapshot.context.blockObjects.at(0);
  const elementRef = blockObjectPopover.snapshot.context
    .elementRef as RefObject<HTMLElement | null>;
  // Keyed by block so a stale edit never opens on the next selected block.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // Dismissed here rather than through the machine: it only reopens on a
  // selection change, so clicking the already-selected block would do nothing.
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const element = elementRef?.current;

  const active = blockObjectPopover.snapshot.matches({ enabled: "active" });
  useEffect(() => {
    if (!active) setHiddenKey(null);
  }, [active]);

  useEffect(() => {
    // Capture phase: the editor stops the event inside the block.
    const show = (e: PointerEvent) => {
      if (elementRef?.current?.contains(e.target as Node)) setHiddenKey(null);
    };
    document.addEventListener("pointerdown", show, true);
    return () => document.removeEventListener("pointerdown", show, true);
  }, [elementRef]);

  if (!active || !blockObject) {
    return null;
  }

  const key = blockObject.value._key;
  if (hiddenKey === key && editingKey !== key) return null;

  const title = blockObject.schemaType.title ?? blockObject.schemaType.name;
  const block = blockByName(blockObject.value._type);
  const editing = editingKey === key;
  const hide = () => {
    setEditingKey(null);
    setHiddenKey(key);
  };
  const onBlock = (target: EventTarget | null) =>
    !!element && target instanceof Node && element.contains(target);
  const inEditor = (target: EventTarget | null) =>
    target instanceof Node &&
    !!element?.closest("[contenteditable='true']")?.contains(target);

  if (editing) {
    return (
      <BlockSurface
        open
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingKey(null);
        }}
        title={title}
        anchor={elementRef}
      >
        <ObjectForm
          key={blockObject.value._key}
          submitLabel="Save"
          fields={blockObject.schemaType.fields}
          defaultValues={toFormValue(block, {
            ...block?.defaultValues,
            ...blockObject.value,
          })}
          onSubmit={({ value }) => {
            blockObjectPopover.send({
              type: "edit",
              at: blockObject.at,
              props: fromFormValue(block, value),
            });
            setEditingKey(null);
          }}
        />
      </BlockSurface>
    );
  }

  return (
    <Popover
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) hide();
      }}
    >
      <PopoverAnchor virtualRef={elementRef as RefObject<HTMLElement>} />
      <PopoverContent
        side="top"
        align="end"
        hideWhenDetached
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (onBlock(e.target)) e.preventDefault();
        }}
        // Clicking the block focuses the editor; elsewhere in it changes the selection anyway.
        onFocusOutside={(e) => {
          if (inEditor(e.target)) e.preventDefault();
        }}
        className="flex w-fit gap-2 p-2"
      >
        {blockObject.schemaType.fields.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Edit"
                variant="secondary"
                size="sm"
                className="max-md:size-11"
                onClick={() => setEditingKey(key)}
              >
                <PencilIcon className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Remove"
              variant="destructive"
              size="sm"
              className="max-md:size-11"
              onClick={() => {
                blockObjectPopover.send({ type: "remove", at: blockObject.at });
              }}
            >
              <TrashIcon className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove</TooltipContent>
        </Tooltip>
      </PopoverContent>
    </Popover>
  );
}
