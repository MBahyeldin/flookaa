import { useBlockObjectPopover } from "@portabletext/toolbar";
import type { ToolbarBlockObjectSchemaType } from "@portabletext/toolbar";
import { PencilIcon, TrashIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ObjectForm } from "./object-form";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function BlockObjectPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarBlockObjectSchemaType>;
}) {
  const blockObjectPopover = useBlockObjectPopover(props);
  const blockObject = blockObjectPopover.snapshot.context.blockObjects.at(0);

  const [boundingClientRect, setBoundingClientRect] = useState<
    DOMRect | undefined
  >();
  useEffect(() => {
    const rect =
      blockObjectPopover.snapshot.context.elementRef.current?.getBoundingClientRect();
    setBoundingClientRect(rect);
  }, [blockObjectPopover.snapshot.context.elementRef]);

  window.onscroll = () => {
    blockObjectPopover.send({ type: "close" });
  };

  if (
    blockObjectPopover.snapshot.matches("disabled") ||
    blockObjectPopover.snapshot.matches({ enabled: "inactive" })
  ) {
    return null;
  }

  if (!blockObject) {
    return null;
  }
  if (
    blockObjectPopover.snapshot.context.elementRef.current?.closest(
      '[data-slate-editor="true"]'
    )
  ) {
    (
      blockObjectPopover.snapshot.context.elementRef.current.closest(
        '[data-slate-editor="true"]'
      )! as HTMLElement
    ).onscroll = () => {
      blockObjectPopover.send({ type: "close" });
    };
  }

  return (
    <Popover
      open={true}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) {
          blockObjectPopover.send({ type: "close" });
        }
      }}
    >
      <PopoverAnchor
        style={{
          position: "fixed",
          top: boundingClientRect ? boundingClientRect.top + 40 : -9999,
          left: boundingClientRect
            ? boundingClientRect.left + boundingClientRect.width
            : -9999,
        }}
        key={boundingClientRect?.top + "-" + boundingClientRect?.left}
      ></PopoverAnchor>
      <PopoverContent
        side="right"
        align="center"
        className={cn("flex gap-2 p-2 w-fit")}
      >
        {blockObject.schemaType.fields.length > 0 ? (
          <Dialog
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                blockObjectPopover.send({ type: "close" });
              }
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button aria-label="Edit" variant="secondary" size="sm">
                    <PencilIcon className="size-3" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <DialogContent>
              <DialogTitle>
                {" "}
                {blockObject.schemaType.title ?? blockObject.schemaType.name}
              </DialogTitle>
              <ObjectForm
                submitLabel="Save"
                fields={blockObject.schemaType.fields}
                defaultValues={blockObject.value}
                onSubmit={({ value }) => {
                  blockObjectPopover.send({
                    type: "edit",
                    at: blockObject.at,
                    props: value,
                  });
                  blockObjectPopover.send({ type: "close" });
                }}
              />
            </DialogContent>
          </Dialog>
        ) : null}
        <Tooltip>
          <TooltipTrigger>
            <Button
              aria-label="Remove"
              variant="destructive"
              size="sm"
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
