import {
  blockquote,
  bold,
  code,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  italic,
  link,
  normal,
  strikeThrough,
  underline,
} from "@portabletext/keyboard-shortcuts";
import {
  useToolbarSchema,
  type ExtendAnnotationSchemaType,
  type ExtendBlockObjectSchemaType,
  type ExtendDecoratorSchemaType,
  type ExtendListSchemaType,
  type ExtendStyleSchemaType,
} from "@portabletext/toolbar";
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TextQuoteIcon,
  UnderlineIcon,
  MoreHorizontalIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useEditor,
  useEditorSelector,
  type EditorSnapshot,
} from "@portabletext/editor";
import * as selectors from "@portabletext/editor/selectors";
import { StyleButton } from "./button.style";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/useMobile";
import { blockByName } from "../blocks";
import { DecoratorButton } from "./button.decorator";
import { AnnotationButton } from "./button.annotation";
import { ListButton } from "./button.list";
import { BlockObjectPopover } from "./popover.block-object";
const extendDecorator: ExtendDecoratorSchemaType = (decorator) => {
  if (decorator.name === "strong") {
    return {
      ...decorator,
      icon: BoldIcon,
      shortcut: bold,
    };
  }

  if (decorator.name === "em") {
    return {
      ...decorator,
      icon: ItalicIcon,
      shortcut: italic,
    };
  }

  if (decorator.name === "code") {
    return {
      ...decorator,
      icon: CodeIcon,
      shortcut: code,
    };
  }

  if (decorator.name === "underline") {
    return {
      ...decorator,
      icon: UnderlineIcon,
      shortcut: underline,
    };
  }

  if (decorator.name === "strike-through") {
    return {
      ...decorator,
      icon: StrikethroughIcon,
      shortcut: strikeThrough,
    };
  }

  if (decorator.name === "subscript") {
    return {
      ...decorator,
      icon: SubscriptIcon,
      mutuallyExclusive: ["superscript"],
    };
  }

  if (decorator.name === "superscript") {
    return {
      ...decorator,
      icon: SuperscriptIcon,
      mutuallyExclusive: ["subscript"],
    };
  }

  return decorator;
};

const extendAnnotation: ExtendAnnotationSchemaType = (annotation) => {
  if (annotation.name === "link") {
    return {
      ...annotation,
      icon: LinkIcon,
      defaultValues: {
        href: "https://",
      },
      shortcut: link,
    };
  }

  return annotation;
};

const extendStyle: ExtendStyleSchemaType = (style) => {
  if (style.name === "normal") {
    return {
      ...style,
      icon: PilcrowIcon,
      shortcut: normal,
    };
  }
  if (style.name === "h1") {
    return {
      ...style,
      icon: Heading1Icon,
      shortcut: h1,
    };
  }

  if (style.name === "h2") {
    return {
      ...style,
      icon: Heading2Icon,
      shortcut: h2,
    };
  }

  if (style.name === "h3") {
    return {
      ...style,
      icon: Heading3Icon,
      shortcut: h3,
    };
  }

  if (style.name === "h4") {
    return {
      ...style,
      icon: Heading4Icon,
      shortcut: h4,
    };
  }

  if (style.name === "h5") {
    return {
      ...style,
      icon: Heading5Icon,
      shortcut: h5,
    };
  }

  if (style.name === "h6") {
    return {
      ...style,
      icon: Heading6Icon,
      shortcut: h6,
    };
  }

  if (style.name === "blockquote") {
    return {
      ...style,
      icon: TextQuoteIcon,
      shortcut: blockquote,
    };
  }

  return style;
};

const extendList: ExtendListSchemaType = (list) => {
  if (list.name === "bullet") {
    return {
      ...list,
      icon: ListIcon,
    };
  }

  if (list.name === "number") {
    return {
      ...list,
      icon: ListOrderedIcon,
    };
  }

  return list;
};

const extendBlockObject: ExtendBlockObjectSchemaType = (blockObject) => {
  const block = blockByName(blockObject.name);
  if (!block) return blockObject;
  return {
    ...blockObject,
    icon: block.icon,
    defaultValues: block.defaultValues,
  };
};

function useEditorToolbarSchema() {
  return useToolbarSchema({
    extendDecorator,
    extendAnnotation,
    extendStyle,
    extendList,
    extendBlockObject,
  });
}

// Phones keep the common ones inline and the rest behind "⋯".
const mobileDecorators = ["strong", "em"];

type Measurable = { getBoundingClientRect(): DOMRect };

// A string so the selector compares by value and only re-renders on change.
function selectionKey(snapshot: EditorSnapshot): string | null {
  if (!selectors.isSelectionExpanded(snapshot)) return null;
  if (selectors.getSelectedTextBlocks(snapshot).length === 0) return null;
  return JSON.stringify(snapshot.context.selection);
}

function inEditable(node: Node | null | undefined): boolean {
  const element = node instanceof Element ? node : node?.parentElement;
  return !!element?.closest("[contenteditable='true']");
}

function selectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !inEditable(selection.anchorNode)) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

export function SelectionToolbar() {
  const editor = useEditor();
  const key = useEditorSelector(editor, selectionKey);
  const schema = useEditorToolbarSchema();
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState<string | null>(null);
  // Shown once a drag-select ends, not while it grows.
  const [selecting, setSelecting] = useState(false);
  const lastRect = useRef<DOMRect | null>(null);
  const anchor = useRef<Measurable>({
    getBoundingClientRect: () =>
      selectionRect() ?? lastRect.current ?? new DOMRect(),
  });

  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (inEditable(e.target as Node)) setSelecting(true);
    };
    const up = () => setSelecting(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
  }, []);

  const open = !!key && dismissed !== key && !selecting;
  // Both groups stay mounted (the toolbar hooks must see every editor event); this swaps them.
  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    if (!open) setShowMore(false);
  }, [open]);

  useLayoutEffect(() => {
    if (open) lastRect.current = selectionRect() ?? lastRect.current;
  }, [open, key]);

  const allDecorators = schema.decorators ?? [];
  const decorators = isMobile
    ? allDecorators.filter((d) => mobileDecorators.includes(d.name))
    : allDecorators;
  const overflow = isMobile
    ? allDecorators.filter((d) => !mobileDecorators.includes(d.name))
    : [];
  const annotations = schema.annotations ?? [];
  const lists = schema.lists ?? [];
  const divider = (
    <Separator
      orientation="vertical"
      className="mx-0.5 self-center data-[orientation=vertical]:h-5"
    />
  );

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setDismissed(key);
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        // Below on touch, where the system's own copy/paste menu sits above.
        side={isMobile ? "bottom" : "top"}
        sideOffset={8}
        // Kept mounted: the toolbar hooks only enable on an editor event after they mount.
        forceMount
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          // Keeps the editor's selection; nested dialogs still take focus.
          if (e.currentTarget.contains(e.target as Node)) e.preventDefault();
        }}
        className="flex w-auto items-center data-[state=closed]:hidden gap-0.5 rounded-lg bg-card p-1 max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11"
      >
        <div className={`flex items-center gap-0.5 ${showMore ? "hidden" : ""}`}>
          {schema.styles ? (
            <>
              <div className="w-32">
                <StyleButton schemaTypes={schema.styles} />
              </div>
              {divider}
            </>
          ) : null}
          {decorators.map((decorator) => (
            <DecoratorButton key={decorator.name} schemaType={decorator} />
          ))}
          {annotations.length ? divider : null}
          {annotations.map((annotation) => (
            <AnnotationButton key={annotation.name} schemaType={annotation} />
          ))}
          {!isMobile && lists.length ? divider : null}
          {!isMobile &&
            lists.map((list) => <ListButton key={list.name} schemaType={list} />)}
          {isMobile ? (
            <Button variant="ghost" size="icon" aria-label="More formatting" onClick={() => setShowMore(true)}>
              <MoreHorizontalIcon className="size-4" />
            </Button>
          ) : null}
        </div>
        {isMobile ? (
          <div className={`flex items-center gap-0.5 ${showMore ? "" : "hidden"}`}>
            <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setShowMore(false)}>
              <ArrowLeftIcon className="size-4 rtl:rotate-180" />
            </Button>
            {overflow.map((decorator) => (
              <DecoratorButton key={decorator.name} schemaType={decorator} />
            ))}
            {lists.length ? divider : null}
            {lists.map((list) => (
              <ListButton key={list.name} schemaType={list} />
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// Edit/remove for a selected block, mounted once beside the editable.
export function BlockObjectTools() {
  const schema = useEditorToolbarSchema();
  const blockObjects = schema.blockObjects ?? [];
  return blockObjects.length ? (
    <BlockObjectPopover schemaTypes={blockObjects} />
  ) : null;
}
