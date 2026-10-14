import {
  useEditor,
  useEditorSelector,
  type EditorSnapshot,
} from "@portabletext/editor";
import { defineBehavior, effect } from "@portabletext/editor/behaviors";
import * as selectors from "@portabletext/editor/selectors";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { toFormValue, type AnyBlock } from "../blocks";
import { BlockSurface } from "./block-surface";
import { ObjectForm } from "./object-form";
import {
  BlockList,
  insertBlock,
  listKeyDown,
  matchBlocks,
} from "./block-picker";

type Slash = { blockKey: string; spanKey: string; text: string; query: string };

const menuKeys = ["ArrowDown", "ArrowUp", "Enter", "Escape"];

// A string so the selector compares by value and only re-renders on change.
function slashKey(snapshot: EditorSnapshot): string | null {
  if (!selectors.isSelectionCollapsed(snapshot)) return null;
  const focus = selectors.getFocusTextBlock(snapshot);
  if (!focus || focus.node.listItem || focus.node.children.length !== 1) {
    return null;
  }
  const span = focus.node.children[0] as { _key: string; text?: unknown };
  if (typeof span.text !== "string" || !/^\/[\w-]*$/.test(span.text)) {
    return null;
  }
  if (snapshot.context.selection?.focus.offset !== span.text.length) {
    return null;
  }
  return JSON.stringify([focus.node._key, span._key, span.text]);
}

function parseSlash(key: string | null): Slash | null {
  if (!key) return null;
  const [blockKey, spanKey, text] = JSON.parse(key) as string[];
  return { blockKey, spanKey, text, query: text.slice(1) };
}

function caretRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.height) return rect;
  return selection.focusNode?.parentElement?.getBoundingClientRect() ?? null;
}

export function SlashMenuPlugin() {
  const editor = useEditor();
  const key = useEditorSelector(editor, slashKey);
  const slash = useMemo(() => parseSlash(key), [key]);
  const matches = useMemo(
    () => (slash ? matchBlocks(slash.query) : []),
    [slash],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [formBlock, setFormBlock] = useState<AnyBlock | null>(null);
  const caret = useRef<{ getBoundingClientRect(): DOMRect } | null>(null);

  const open = !!slash && dismissed !== slash.blockKey && !formBlock;

  useEffect(() => {
    setActiveIndex(0);
    if (!slash) setDismissed(null);
  }, [slash]);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = caretRect();
    if (rect) caret.current = { getBoundingClientRect: () => rect };
  }, [open, key]);

  const pick = (block: AnyBlock) => {
    if (!slash) return;
    const path = [
      { _key: slash.blockKey },
      "children",
      { _key: slash.spanKey },
    ];
    editor.send({
      type: "delete",
      at: {
        anchor: { path, offset: 0 },
        focus: { path, offset: slash.text.length },
      },
    });
    if (block.fields.length === 0) {
      insertBlock(editor, block, { ...block.defaultValues });
    } else {
      setFormBlock(block);
    }
  };

  const onKey = useRef<(key: string) => void>(() => {});
  onKey.current = (pressed) => {
    if (!slash) return;
    if (pressed === "Escape") {
      setDismissed(slash.blockKey);
      return;
    }
    const next = listKeyDown(pressed, matches.length, activeIndex);
    if (next === "pick") queueMicrotask(() => pick(matches[activeIndex]));
    else if (next !== null) setActiveIndex(next);
  };

  const openRef = useRef(open);
  openRef.current = open;

  useEffect(
    () =>
      editor.registerBehavior({
        behavior: defineBehavior({
          on: "keyboard.keydown",
          guard: ({ event }) =>
            openRef.current && menuKeys.includes(event.originEvent.key)
              ? { pressed: event.originEvent.key }
              : false,
          actions: [(_, { pressed }) => [effect(() => onKey.current(pressed))]],
        }),
      }),
    [editor],
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen && slash) setDismissed(slash.blockKey);
        }}
      >
        <PopoverAnchor
          virtualRef={
            caret as React.RefObject<{ getBoundingClientRect(): DOMRect }>
          }
        />
        <PopoverContent
          side="bottom"
          align="start"
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="max-h-72 w-72 overflow-y-auto p-1"
        >
          <BlockList
            blocks={matches}
            activeIndex={activeIndex}
            onActiveIndex={setActiveIndex}
            onPick={pick}
            keepFocus
          />
        </PopoverContent>
      </Popover>
      {formBlock ? (
        <BlockSurface
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setFormBlock(null);
              editor.send({ type: "focus" });
            }
          }}
          title={formBlock.title}
          anchor={caret}
        >
          <ObjectForm
            key={formBlock.name}
            submitLabel="Insert"
            fields={formBlock.fields}
            defaultValues={toFormValue(formBlock, formBlock.defaultValues)}
            onSubmit={({ value }) => {
              insertBlock(editor, formBlock, value);
              setFormBlock(null);
            }}
          />
        </BlockSurface>
      ) : null}
    </>
  );
}
