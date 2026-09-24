 
import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
  type BlockDecoratorRenderProps,
  type BlockRenderProps,
  type BlockStyleRenderProps,
  type EditorEmittedEvent,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
  type RangeDecoration,
  type RenderAnnotationFunction,
  type RenderChildFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from "@portabletext/editor";
import {
  ActivityIcon,
  Loader,
  SeparatorHorizontalIcon,
} from "lucide-react";
import { useContext, useEffect, useState, type JSX } from "react";
import { tv } from "tailwind-variants";
import "./editor.css";
import { OneLinePlugin } from "@portabletext/plugin-one-line";

import { type EditorActorRef } from "./toolbar/machine";
import {
  EditorFeatureFlagsContext,
  PlaygroundFeatureFlagsContext,
} from "./toolbar/feature-flags";
import { ErrorBoundary } from "./toolbar/error-boundary";
import { ErrorScreen } from "./toolbar/error-screen";
import {
  CommentAnnotationSchema,
  LinkAnnotationSchema,
  playgroundSchemaDefinition,
  StockTickerSchema,
} from "./schema";
import { PortableTextToolbar } from "./toolbar/portable-text-toolbar";
import { EmojiPickerPlugin } from "./toolbar/plugin-emoji";
import { CodeEditorPlugin } from "./toolbar/plugin.code-editor";
import { LinkPlugin } from "./toolbar/plugin.link";
import { ImageDeserializerPlugin } from "./toolbar/plugin.image-deserializer";
import { HtmlDeserializerPlugin } from "./toolbar/plugin.html-deserializer";
import { TextFileDeserializerPlugin } from "./toolbar/plugin.text-file-deserializer";
import { MarkdownShortcutsPlugin } from "@portabletext/plugin-markdown-shortcuts";
import { DebugMenu } from "./debug-menu";
import { markdownShortcutsPluginProps } from "./toolbar/plugin.markdown";
import { useSelector } from "@xstate/react";
import { useBlockObjectsProvider } from "@/BlockObjectsProvider.context";

const editorStyle = tv({
  // min-w-0: grid items also default to min-width:auto, so without this the
  // toolbar's intrinsic width propagates up and widens the whole page.
  base: "grid gap-2 items-start min-w-0 [&>*]:min-w-0",
  variants: {
    debugModeEnabled: {
      true: "grid-cols-1 md:grid-cols-2",
      false: "grid-cols-1",
    },
  },
});

export default function Editor(props: {
  editorRef: EditorActorRef;
  rangeDecorations: RangeDecoration[];
  setValue: (blocks: PortableTextTextBlock<PortableTextSpan | PortableTextObject>[]) => void;
}) {
  const value = useSelector(props.editorRef, (s) => s?.context?.value);
  const keyGenerator = useSelector(
    props.editorRef,
    (s) => s?.context?.keyGenerator
  );
  const debugModeEnabled = useSelector(props.editorRef, (s) =>
    s?.matches({ "debug mode": "shown" })
  );
  const [loading, setLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const playgroundFeatureFlags = useContext(PlaygroundFeatureFlagsContext);
  const featureFlags = useSelector(
    props.editorRef,
    (s) => s?.context?.featureFlags
  );
  const { blockObjectsProvider } = useBlockObjectsProvider();
  const blockObjects = blockObjectsProvider?.BlockObjects ?? [];

  /*
   * Deps are [value, setValue], NOT [value, props].
   *
   * `props` is a fresh object on every render, so depending on it made this
   * effect run after every render — and since it calls setState in the parent,
   * each run scheduled the next render, which re-ran the effect. That's the
   * "Maximum update depth exceeded" crash when publishing a post: submitting
   * resets the value, which kicked off the cycle.
   */
  const { setValue } = props;
  useEffect(() => {
    setValue(value as any);
  }, [value, setValue]);

  return (
    <div
      data-testid={props.editorRef.id}
      className={editorStyle({
        debugModeEnabled: debugModeEnabled as unknown as boolean,
      })}
    >
      <ErrorBoundary
        fallbackProps={{ area: "PortableTextEditor" }}
        fallback={ErrorScreen}
        onError={console.error}
      >
        <EditorProvider
          initialConfig={{
            initialValue: value,
            keyGenerator,
            readOnly,
            schemaDefinition: playgroundSchemaDefinition(blockObjects as any),
          }}
        >
          <EditorEventListener
            editorRef={props.editorRef}
            value={value as any}
            on={(event) => {
              if (event.type === "mutation") {
                props.editorRef.send(event);
                /*
                 * Lift the new value straight off the mutation event.
                 *
                 * It used to reach React the long way round: mutation → parent
                 * machine → "broadcast value" back into this same editor →
                 * context.value changes → the effect below calls setValue. That
                 * echo is what reset the caret mid-edit, so it no longer fires
                 * for the originating editor — which would otherwise leave the
                 * parent's state empty and the Post button permanently
                 * disabled. The event already carries the value, so take it
                 * from here and leave the editor's own document untouched.
                 */
                setValue(event.value as any);
              }
              if (event.type === "loading") {
                setLoading(true);
              }
              if (event.type === "done loading") {
                setLoading(false);
              }
              if (event.type === "editable") {
                setReadOnly(false);
              }
              if (event.type === "read only") {
                setReadOnly(true);
              }
            }}
          />
          {/*
            One bordered surface for toolbar + editable, instead of the toolbar
            carrying its own full border with rounded-top corners while sitting
            gap-4 away from an editable with rounded-bottom corners. The two
            were clearly meant to join up; the gap and the toolbar's closed
            bottom edge were what made the seam look unfinished.
          */}
          {/* No `container` here: that Tailwind utility applies a breakpoint
              max-width plus auto margins, which inset the editor ~18px inside
              its card instead of letting it fill the available width. */}
          <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background">
            {playgroundFeatureFlags.toolbar ? <PortableTextToolbar /> : null}

            {featureFlags.emojiPickerPlugin ? <EmojiPickerPlugin /> : null}
            {featureFlags.codeEditorPlugin ? <CodeEditorPlugin /> : null}
            {featureFlags.linkPlugin ? <LinkPlugin /> : null}
            {featureFlags.imageDeserializerPlugin ? (
              <ImageDeserializerPlugin />
            ) : null}
            {featureFlags.htmlDeserializerPlugin ? (
              <HtmlDeserializerPlugin />
            ) : null}
            {featureFlags.textFileDeserializerPlugin ? (
              <TextFileDeserializerPlugin />
            ) : null}
            {featureFlags.markdownPlugin ? (
              <MarkdownShortcutsPlugin {...markdownShortcutsPluginProps} />
            ) : null}
            {featureFlags.oneLinePlugin ? <OneLinePlugin /> : null}
            <div className="flex gap-2 items-center">
              <ErrorBoundary
                fallbackProps={{ area: "PortableTextEditable" }}
                fallback={ErrorScreen}
                onError={console.error}
              >
                <EditorFeatureFlagsContext.Provider value={featureFlags}>
                  <PortableTextEditable
                    // The "Type something" placeholder is a rendered node, not
                    // an accessible name — without this the editor announces as
                    // an unlabeled textbox.
                    aria-label="Post content"
                    /* The parent owns the border and radius now, so no
                       rounded-b-md here and no negative margins bleeding out
                       past it. */
                    className={`outline-none data-[read-only=true]:opacity-50 px-3 py-2 h-75 overflow-auto flex-1 ${
                      featureFlags.dragHandles ? "ps-5" : ""
                    }`}
                    rangeDecorations={props.rangeDecorations}
                    renderAnnotation={renderAnnotation}
                    renderBlock={RenderBlock as any}
                    renderChild={renderChild}
                    renderDecorator={renderDecorator}
                    renderListItem={renderListItem}
                    renderPlaceholder={renderPlaceholder}
                    renderStyle={renderStyle}
                  />
                </EditorFeatureFlagsContext.Provider>
              </ErrorBoundary>
              {loading ? <Loader /> : null}
            </div>
          </div>
          {debugModeEnabled ? (
            <DebugMenu editorRef={props.editorRef} readOnly={readOnly} />
          ) : null}
        </EditorProvider>
      </ErrorBoundary>
    </div>
  );
}

function EditorEventListener(props: {
  editorRef: EditorActorRef;
  on: (event: EditorEmittedEvent) => void;
  value: Array<PortableTextBlock> | undefined;
}) {
  const patchSubscriptionActive = useSelector(props.editorRef, (s) =>
    s?.matches({ "patch subscription": "active" })
  );
  const valueSubscriptionActive = useSelector(props.editorRef, (s) =>
    s?.matches({ "value subscription": "active" })
  );
  const editor = useEditor();

  useEffect(() => {
    const subscription = props.editorRef.on("patches", (event) => {
      if (patchSubscriptionActive) {
        editor.send(event);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [props.editorRef, editor, patchSubscriptionActive]);

  useEffect(() => {
    const subscription = editor.on("*", props.on);

    return () => {
      subscription.unsubscribe();
    };
  }, [editor, props.on]);

  useEffect(() => {
    if (valueSubscriptionActive) {
      editor.send({
        type: "update value",
        value: props.value,
      });
    }
  }, [editor, props.value, valueSubscriptionActive]);

  return null;
}

const renderAnnotation: RenderAnnotationFunction = (props: any) => {
  if (CommentAnnotationSchema.safeParse(props).success) {
    return <span className="bg-warning">{props.children}</span>;
  }

  if (LinkAnnotationSchema.safeParse(props).success) {
    return <span className="text-foreground underline">{props.children}</span>;
  }

  return props.children;
};

const breakStyle = tv({
  base: "my-1 p-1 flex items-center justify-center gap-1 border-2 border-muted rounded",
  variants: {
    selected: {
      true: "border-",
    },
    focused: {
      true: "bg-blue-50",
    },
  },
});

const RenderBlock = (props: BlockRenderProps) => {
  const enableDragHandles = useContext(EditorFeatureFlagsContext).dragHandles;
  const editor = useEditor();
  const readOnly = useEditorSelector(
    editor,
    (s: { context: { readOnly: boolean } }) => s?.context?.readOnly
  );

  let children = props.children;

  if (props.schemaType.name === "break") {
    children = (
      <div
        className={breakStyle({
          selected: props.selected,
          focused: props.focused,
        })}
      >
        <SeparatorHorizontalIcon className="size-4" />
      </div>
    );
  }

  const { blockObjectsProvider } = useBlockObjectsProvider();
  const blockObject = blockObjectsProvider?.getBlockObjectByNameOrNull(
    props.schemaType.name
  );

  if (blockObject) {
    return blockObject.renderBlock ? blockObject.renderBlock(props as any) : null;
    // return props.schemaType
  }

  if (props.level === undefined && enableDragHandles) {
    // Don't render drag handle on other levels right now since the styling is off
    return (
      <div className="me-1 relative hover:bg-red">
        <div
          contentEditable={false}
          draggable={!readOnly}
          className={`absolute top-0 -left-3 bottom-0 w-1.5 bg-muted rounded cursor-grab`}
        >
          <span />
        </div>
        <div>{children}</div>
      </div>
    );
  }

  return children;
};

const renderDecorator: RenderDecoratorFunction = (
  props: BlockDecoratorRenderProps
) => {
  return (decoratorMap.get(props.value) ?? ((props) => props.children))(props);
};

const stockTickerStyle = tv({
  base: "max-w-30 inline-flex items-center gap-1 border-2 border-muted rounded px-1 font-mono text-xs",
  variants: {
    selected: {
      true: "border-primary",
    },
    focused: {
      true: "bg-primary/10",
    },
  },
});

const inlineImageStyle = tv({
  base: "max-w-35 grid grid-cols-[auto_1fr] items-start gap-1 border-2 border-muted rounded text-sm",
  variants: {
    selected: {
      true: "border-primary",
    },
    focused: {
      true: "bg-primary/10",
    },
  },
});

const renderChild: RenderChildFunction = (props: any) => {
  const stockTicker = StockTickerSchema.safeParse(props).data;

  if (stockTicker) {
    return (
      <span
        className={stockTickerStyle({
          selected: props.selected,
          focused: props.focused,
        })}
      >
        <ActivityIcon className="size-3 shrink-0" />
        {stockTicker.value.symbol}
      </span>
    );
  }

  const isImage = props.schemaType.name === "inlineImage";
  if (isImage) {
    const image = props;
    return (
      <span
        className={inlineImageStyle({
          selected: props.selected,
          focused: props.focused,
        })}
      >
        <span className="bg-muted size-5 overflow-clip flex items-center justify-center">
          <img
            className="object-scale-down max-w-full"
            src={image.value.src}
            alt={image.value.alt ?? ""}
          />
        </span>
        <span className="text-ellipsis overflow-hidden whitespace-nowrap">
          {image.value.src}
        </span>
      </span>
    );
  }

  return props.children;
};

const renderListItem: RenderListItemFunction = (props: any) => {
  return props.children;
};

const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-foreground px-2">Type something</span>
);

const renderStyle: RenderStyleFunction = (props: any) => {
  return (styleMap.get(props.value) ?? ((props) => props.children))(props);
};

const decoratorMap: Map<
  string,
  (props: BlockDecoratorRenderProps) => JSX.Element
> = new Map([
  ["strong", (props) => <strong>{props.children}</strong>],
  ["em", (props) => <em>{props.children}</em>],
  ["code", (props) => <code>{props.children}</code>],
  [
    "underline",
    (props) => (
      <span style={{ textDecoration: "underline" }}>{props.children}</span>
    ),
  ],
  [
    "strike-through",
    (props) => (
      <span style={{ textDecorationLine: "line-through" }}>
        {props.children}
      </span>
    ),
  ],
  ["subscript", (props) => <sub>{props.children}</sub>],
  ["superscript", (props) => <sup>{props.children}</sup>],
]);

const styleMap: Map<string, (props: BlockStyleRenderProps) => JSX.Element> =
  new Map([
    ["normal", (props) => <p className="my-1">{props.children}</p>],
    [
      "h1",
      (props) => <h1 className="my-1 font-bold text-5xl">{props.children}</h1>,
    ],
    [
      "h2",
      (props) => <h2 className="my-1 font-bold text-4xl">{props.children}</h2>,
    ],
    [
      "h3",
      (props) => <h3 className="my-1 font-bold text-3xl">{props.children}</h3>,
    ],
    [
      "h4",
      (props) => <h4 className="my-1 font-bold text-2xl">{props.children}</h4>,
    ],
    [
      "h5",
      (props) => <h5 className="my-1 font-bold text-xl">{props.children}</h5>,
    ],
    [
      "h6",
      (props) => <h6 className="my-1 font-bold text-lg">{props.children}</h6>,
    ],
    [
      "blockquote",
      (props) => (
        <blockquote className="my-1 pl-2 py-1 border-muted border-l-4">
          {props.children}
        </blockquote>
      ),
    ],
  ]);
