/* eslint-disable @typescript-eslint/no-explicit-any */
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
  BugIcon,
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
import { RangeDecorationButton } from "./toolbar/range-decoration-button";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
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
  base: "grid gap-2 items-start",
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
  setValue: (blocks: PortableTextBlock[]) => void;
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

  useEffect(() => {
    console.log("value changed", value);
    
    props.setValue(value as any);
  }, [value, props]);

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
            schemaDefinition: playgroundSchemaDefinition(blockObjects),
          }}
        >
          <EditorEventListener
            editorRef={props.editorRef}
            value={value as any}
            on={(event) => {
              if (event.type === "mutation") {
                props.editorRef.send(event);
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
          <div className="container flex flex-col gap-4 overflow-clip">
            {playgroundFeatureFlags.toolbar ? (
              <PortableTextToolbar>
                <RangeDecorationButton
                  onAddRangeDecoration={(rangeDecoration) => {
                    props.editorRef.send({
                      type: "add range decoration",
                      rangeDecoration,
                    });
                  }}
                  onRangeDecorationMoved={(details) => {
                    props.editorRef.send({
                      type: "move range decoration",
                      details,
                    });
                  }}
                />
                <Separator orientation="vertical" />
                <Tooltip>
                  <TooltipTrigger>
                    <Switch
                      checked={debugModeEnabled as unknown as boolean}
                      onCheckedChange={() => {
                        props.editorRef.send({ type: "toggle debug mode" });
                      }}
                    >
                      <BugIcon className="size-4" />
                    </Switch>
                  </TooltipTrigger>
                  <TooltipContent>Toggle debug mode</TooltipContent>
                </Tooltip>
              </PortableTextToolbar>
            ) : null}

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
                    className={`rounded-b-md outline-none data-[read-only=true]:opacity-50 px-2 h-75 -mx-2 -mb-2 overflow-auto flex-1 ${
                      featureFlags.dragHandles ? "ps-5" : ""
                    }`}
                    rangeDecorations={props.rangeDecorations}
                    renderAnnotation={renderAnnotation}
                    renderBlock={RenderBlock}
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
    return blockObject.renderBlock ? blockObject.renderBlock(props) : null;
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
