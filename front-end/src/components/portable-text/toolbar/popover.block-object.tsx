import { useBlockObjectPopover } from "@portabletext/toolbar";
import type { ToolbarBlockObjectSchemaType } from "@portabletext/toolbar";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useState, type RefObject } from "react";
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

  if (
    blockObjectPopover.snapshot.matches("disabled") ||
    blockObjectPopover.snapshot.matches({ enabled: "inactive" }) ||
    !blockObject
  ) {
    return null;
  }

  const title = blockObject.schemaType.title ?? blockObject.schemaType.name;
  const block = blockByName(blockObject.value._type);
  const editing = editingKey === blockObject.value._key;
  const close = () => {
    setEditingKey(null);
    blockObjectPopover.send({ type: "close" });
  };

  if (editing) {
    return (
      <BlockSurface
        open
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
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
            close();
          }}
        />
      </BlockSurface>
    );
  }

  return (
    <Popover
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
    >
      <PopoverAnchor virtualRef={elementRef as RefObject<HTMLElement>} />
      <PopoverContent
        side="top"
        align="end"
        hideWhenDetached
        onOpenAutoFocus={(e) => e.preventDefault()}
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
                onClick={() => setEditingKey(blockObject.value._key)}
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
