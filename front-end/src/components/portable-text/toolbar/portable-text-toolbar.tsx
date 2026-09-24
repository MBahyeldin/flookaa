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
  type ExtendInlineObjectSchemaType,
  type ExtendListSchemaType,
  type ExtendStyleSchemaType,
} from "@portabletext/toolbar";
import {
  ActivityIcon,
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MessageSquareTextIcon,
  PilcrowIcon,
  MoreHorizontalIcon,
  SeparatorHorizontalIcon,
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
import { DecoratorButton } from "./button.decorator";
import { AnnotationButton } from "./button.annotation";
import { ListButton } from "./button.list";
import { BlockObjectButton } from "./button.block-object";
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

  if (annotation.name === "comment") {
    return {
      ...annotation,
      icon: MessageSquareTextIcon,
      defaultValues: {
        text: "Consider rewriting this",
      },
      mutuallyExclusive: [],
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
  if (blockObject.name === "break") {
    return {
      ...blockObject,
      icon: SeparatorHorizontalIcon,
    };
  }

  if (blockObject.name === "image") {
    return {
      ...blockObject,
      icon: ImageIcon,
      defaultValues: {
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4OTggMjQwIj48cG9seWdvbiBwb2ludHM9IjM5Mi4xOSA3OC40NSAzOTIuMTMgMTAwLjc1IDM3Mi4xOSA4OS4yNCAzNzEuOSAxODkuMjEgMzU4LjkxIDE4MS43MSAzNTkuMTkgODEuNzQgMzM5LjM1IDcwLjI4IDMzOS40MiA0Ny45OCAzOTIuMTkgNzguNDUiLz48cG9seWdvbiBwb2ludHM9IjQ0Mi42NyAxMDcuNTkgNDQyLjYxIDEyOS45IDQxMy4yOSAxMTIuOTcgNDEzLjIyIDEzOS42NSA0MzkuODEgMTU1IDQzOS43NSAxNzYuNzIgNDEzLjE2IDE2MS4zNyA0MTMuMDcgMTkwLjQ0IDQ0Mi4zOSAyMDcuMzYgNDQyLjMyIDIyOS44NyA0MDAuMzEgMjA1LjYxIDQwMC42NiA4My4zNCA0NDIuNjcgMTA3LjU5Ii8+PHBvbHlnb24gcG9pbnRzPSI1MDMuNCA3OS4yMiA0ODMuODYgMTUwLjE0IDUwNC43MiAyMDAuOTQgNDkwLjczIDIwOS4wMSA0NzYuNjQgMTc0LjY1IDQ2Mi44OCAyMjUuMSA0NDkuMTkgMjMzIDQ2OS42OSAxNTguNzIgNDQ5LjgyIDExMC4xNSA0NjMuODkgMTAyLjAzIDQ3Ni44MSAxMzQuMjYgNDg5LjgxIDg3LjA2IDUwMy40IDc5LjIyIi8+PHBvbHlnb24gcG9pbnRzPSI1NTcuNzUgNDcuODMgNTU3LjgyIDcwLjE0IDUzOC42IDgxLjI0IDUzOC44OCAxODEuMjIgNTI2LjM2IDE4OC40NCA1MjYuMDggODguNDYgNTA2Ljk1IDk5LjUxIDUwNi44OSA3Ny4yIDU1Ny43NSA0Ny44MyIvPjxwYXRoIGQ9Ik00MTkuMzcsMjcuMTJoMHMuMTktMzEuODIsMjcuODMtMTUuODMsMjcuNjUsNDcuODYsMjcuNjUsNDcuODZsLTkuMjItNS4zM3MwLTIxLjI4LTE4LjQzLTMxLjkyLTE4LjQzLDEwLjY0LTE4LjQzLDEwLjY0WiIvPjwvc3ZnPgo=",
        alt: "Portable Text logo",
      },
    };
  }

  return blockObject;
};

const extendInlineObject: ExtendInlineObjectSchemaType = (inlineObject) => {
  if (inlineObject.name === "stock-ticker") {
    return {
      ...inlineObject,
      icon: ActivityIcon,
      defaultValues: {
        symbol: "NVDA",
      },
    };
  }

  if (inlineObject.name === "image") {
    return {
      ...inlineObject,
      icon: ImageIcon,
      defaultValues: {
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4OTggMjQwIj48cG9seWdvbiBwb2ludHM9IjM5Mi4xOSA3OC40NSAzOTIuMTMgMTAwLjc1IDM3Mi4xOSA4OS4yNCAzNzEuOSAxODkuMjEgMzU4LjkxIDE4MS43MSAzNTkuMTkgODEuNzQgMzM5LjM1IDcwLjI4IDMzOS40MiA0Ny45OCAzOTIuMTkgNzguNDUiLz48cG9seWdvbiBwb2ludHM9IjQ0Mi42NyAxMDcuNTkgNDQyLjYxIDEyOS45IDQxMy4yOSAxMTIuOTcgNDEzLjIyIDEzOS42NSA0MzkuODEgMTU1IDQzOS43NSAxNzYuNzIgNDEzLjE2IDE2MS4zNyA0MTMuMDcgMTkwLjQ0IDQ0Mi4zOSAyMDcuMzYgNDQyLjMyIDIyOS44NyA0MDAuMzEgMjA1LjYxIDQwMC42NiA4My4zNCA0NDIuNjcgMTA3LjU5Ii8+PHBvbHlnb24gcG9pbnRzPSI1MDMuNCA3OS4yMiA0ODMuODYgMTUwLjE0IDUwNC43MiAyMDAuOTQgNDkwLjczIDIwOS4wMSA0NzYuNjQgMTc0LjY1IDQ2Mi44OCAyMjUuMSA0NDkuMTkgMjMzIDQ2OS42OSAxNTguNzIgNDQ5LjgyIDExMC4xNSA0NjMuODkgMTAyLjAzIDQ3Ni44MSAxMzQuMjYgNDg5LjgxIDg3LjA2IDUwMy40IDc5LjIyIi8+PHBvbHlnb24gcG9pbnRzPSI1NTcuNzUgNDcuODMgNTU3LjgyIDcwLjE0IDUzOC42IDgxLjI0IDUzOC44OCAxODEuMjIgNTI2LjM2IDE4OC40NCA1MjYuMDggODguNDYgNTA2Ljk1IDk5LjUxIDUwNi44OSA3Ny4yIDU1Ny43NSA0Ny44MyIvPjxwYXRoIGQ9Ik00MTkuMzcsMjcuMTJoMHMuMTktMzEuODIsMjcuODMtMTUuODMsMjcuNjUsNDcuODYsMjcuNjUsNDcuODZsLTkuMjItNS4zM3MwLTIxLjI4LTE4LjQzLTMxLjkyLTE4LjQzLDEwLjY0LTE4LjQzLDEwLjY0WiIvPjwvc3ZnPgo=",
        alt: "Portable Text logo",
      },
    };
  }

  return inlineObject;
};

export function PortableTextToolbar(props: {
  children?: React.ReactNode;
}) {
  const toolbarSchema = useToolbarSchema({
    extendDecorator,
    extendAnnotation,
    extendStyle,
    extendList,
    extendBlockObject,
    extendInlineObject,
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
      {blockObjects.length ? (
        <>
          <Separator
            orientation="vertical"
            className="mx-0.5 self-center data-[orientation=vertical]:h-5"
          />
          {blockObjects.map((blockObject) => (
            <BlockObjectButton
              key={blockObject.name}
              schemaType={blockObject}
            />
          ))}
        </>
      ) : null}
      {blockObjects.length ? (
        <BlockObjectPopover schemaTypes={blockObjects} />
      ) : null}
    </>
  );

  const hasOverflow =
    isMobile &&
    (overflowDecorators.length > 0 ||
      annotations.length > 0 ||
      lists.length > 0 ||
      blockObjects.length > 0);

  return (
    // No border/rounding of its own: the parent is the bordered surface, and
    // this only needs a divider under it. overflow-x-auto stays as a safety
    // net for very narrow screens even with the overflow menu in place.
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 py-1">
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
        hasOverflow ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0"
                aria-label="More formatting tools"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto p-2">
              <div className="flex flex-wrap items-center gap-1">
                {overflowDecorators.map((decorator) => (
                  <DecoratorButton key={decorator.name} schemaType={decorator} />
                ))}
                {secondaryGroups}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      ) : (
        secondaryGroups
      )}

      {props.children}
    </div>
  );
}
