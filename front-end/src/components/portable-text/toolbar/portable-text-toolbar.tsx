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
  MoreHorizontalIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TextQuoteIcon,
  UnderlineIcon,
} from "lucide-react";
import { StyleButton } from "./button.style";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/useMobile";
import { blockByName } from "../blocks";
import { DecoratorButton } from "./button.decorator";
import { AnnotationButton } from "./button.annotation";
import { ListButton } from "./button.list";
import { InsertBlockButton } from "./button.insert-block";
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
        href: "https://example.com",
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

export function PortableTextToolbar(props: { children?: React.ReactNode }) {
  const toolbarSchema = useToolbarSchema({
    extendDecorator,
    extendAnnotation,
    extendStyle,
    extendList,
    extendBlockObject,
  });

  const isMobile = useIsMobile();

  /*
   * On a phone the full tool set needs ~480px, so it used to be a horizontal
   * scroll strip — tools you couldn't see and wouldn't think to swipe for.
   * Instead: keep the styles picker and the first few decorators inline, and
   * move the rest behind a "…" menu.
   *
   * Each group is rendered in exactly one place (inline OR in the menu), never
   * both: these buttons are backed by per-button xstate machines, and mounting
   * two instances of the same tool would give it two competing state actors.
   */
  const PRIMARY_DECORATOR_COUNT = 3;
  const decorators = toolbarSchema.decorators ?? [];
  const primaryDecorators = isMobile
    ? decorators.slice(0, PRIMARY_DECORATOR_COUNT)
    : decorators;
  const overflowDecorators = isMobile
    ? decorators.slice(PRIMARY_DECORATOR_COUNT)
    : [];

  const annotations = toolbarSchema.annotations ?? [];
  const lists = toolbarSchema.lists ?? [];
  const blockObjects = toolbarSchema.blockObjects ?? [];

  const secondaryGroups = (
    <>
      {annotations.length ? (
        <>
          <Separator
            orientation="vertical"
            className="mx-0.5 self-center data-[orientation=vertical]:h-5"
          />
          {annotations.map((annotation) => (
            <AnnotationButton key={annotation.name} schemaType={annotation} />
          ))}
        </>
      ) : null}
      {lists.length ? (
        <>
          <Separator
            orientation="vertical"
            className="mx-0.5 self-center data-[orientation=vertical]:h-5"
          />
          {lists.map((list) => (
            <ListButton key={list.name} schemaType={list} />
          ))}
        </>
      ) : null}
    </>
  );

  const insertButton = blockObjects.length ? (
    <InsertBlockButton className="ml-auto shrink-0" />
  ) : null;

  const hasOverflow =
    isMobile &&
    (overflowDecorators.length > 0 ||
      annotations.length > 0 ||
      lists.length > 0);

  return (
    // No border/rounding of its own: the parent is the bordered surface, and
    // this only needs a divider under it. overflow-x-auto stays as a safety
    // net for very narrow screens even with the overflow menu in place.
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 py-1 max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11">
      {/*
        The paragraph-style picker is block-scoped: it restyles the whole line,
        while everything to its right applies to the highlighted characters
        only. They used to sit flush together with identical separators, which
        implied they worked the same way. The margin + full-height rule marks
        the boundary between the two kinds of control.
      */}
      {toolbarSchema.styles ? (
        <>
          <StyleButton schemaTypes={toolbarSchema.styles} />
          <Separator
            orientation="vertical"
            className="mx-1 self-center data-[orientation=vertical]:h-6"
          />
        </>
      ) : null}

      {primaryDecorators.length ? (
        <>
          {primaryDecorators.map((decorator) => (
            <DecoratorButton key={decorator.name} schemaType={decorator} />
          ))}
        </>
      ) : null}

      {isMobile ? (
        <>
          {insertButton}
          {hasOverflow ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="More formatting tools"
                >
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-auto p-2 [&_button]:min-h-11 [&_button]:min-w-11"
              >
                <div className="flex flex-wrap items-center gap-1">
                  {overflowDecorators.map((decorator) => (
                    <DecoratorButton
                      key={decorator.name}
                      schemaType={decorator}
                    />
                  ))}
                  {secondaryGroups}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </>
      ) : (
        <>
          {secondaryGroups}
          {insertButton}
        </>
      )}

      {blockObjects.length ? (
        <BlockObjectPopover schemaTypes={blockObjects} />
      ) : null}

      {props.children}
    </div>
  );
}
