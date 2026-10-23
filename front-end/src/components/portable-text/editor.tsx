 
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
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from "@portabletext/editor";
import { Loader } from "lucide-react";
import { useContext, useEffect, useState, type JSX, type ReactNode } from "react";
import "./editor.css";
import { OneLinePlugin } from "@portabletext/plugin-one-line";

import { type EditorActorRef } from "./toolbar/machine";
import { EditorFeatureFlagsContext } from "./toolbar/feature-flags";
import { ErrorBoundary } from "./toolbar/error-boundary";
import { ErrorScreen } from "./toolbar/error-screen";
import { LinkAnnotationSchema, playgroundSchemaDefinition } from "./schema";
import { BlockObjectTools, SelectionToolbar } from "./toolbar/selection-toolbar";
import { InvalidBlocksContext } from "./invalidBlocks";
import { EmojiPickerPlugin } from "./toolbar/plugin-emoji";
import { SlashMenuPlugin } from "./toolbar/plugin.slash-menu";
import { CodeEditorPlugin } from "./toolbar/plugin.code-editor";
import { LinkPlugin } from "./toolbar/plugin.link";
import { ImageDeserializerPlugin } from "./toolbar/plugin.image-deserializer";
import { HtmlDeserializerPlugin } from "./toolbar/plugin.html-deserializer";
import { TextFileDeserializerPlugin } from "./toolbar/plugin.text-file-deserializer";
import { MarkdownShortcutsPlugin } from "@portabletext/plugin-markdown-shortcuts";
import { markdownShortcutsPluginProps } from "./toolbar/plugin.markdown";
import { useSelector } from "@xstate/react";
import { blockByName, blocks } from "./blocks";

// min-w-0: grid items also default to min-width:auto, so without this the
// toolbar's intrinsic width propagates up and widens the whole page.
const editorClassName = "grid grid-cols-1 gap-2 items-start min-w-0 [&>*]:min-w-0";

const schemaBlockObjects = blocks.map(({ name, title, fields }) => ({
  name,
  title,
  fields,
}));

export default function Editor(props: {
  editorRef: EditorActorRef;
  rangeDecorations: RangeDecoration[];
  setValue: (blocks: PortableTextTextBlock<PortableTextSpan | PortableTextObject>[]) => void;
  // Rendered inside the editor's context, under the editable.
  footer?: ReactNode;
  // Grow to the parent's height instead of the content's.
  fill?: boolean;
  autoFocus?: boolean;
}) {
  const value = useSelector(props.editorRef, (s) => s?.context?.value);
  const keyGenerator = useSelector(
    props.editorRef,
    (s) => s?.context?.keyGenerator
  );
  const [loading, setLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const featureFlags = useSelector(
    props.editorRef,
    (s) => s?.context?.featureFlags
  );

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
      className={`${editorClassName} ${props.fill ? "min-h-0 flex-1 grid-rows-[minmax(0,1fr)]" : ""}`}
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
            schemaDefinition: playgroundSchemaDefinition(schemaBlockObjects as any),
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
          <div className={`flex w-full min-w-0 flex-col gap-2 ${props.fill ? "h-full min-h-0" : ""}`}>
            {props.autoFocus ? <FocusOnMount /> : null}
            <SelectionToolbar />
            <BlockObjectTools />

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
            {featureFlags.slashMenuPlugin ? <SlashMenuPlugin /> : null}
            <div className={`flex gap-2 items-start ${props.fill ? "min-h-0 flex-1" : ""}`}>
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
                    className={`outline-none data-[read-only=true]:opacity-50 py-1 overflow-auto flex-1 ${
                      props.fill ? "h-full" : "min-h-30 max-h-[60vh]"
                    } ${
                      featureFlags.dragHandles ? "ps-5" : ""
                    }`}
                    rangeDecorations={props.rangeDecorations}
                    renderAnnotation={renderAnnotation}
                    renderBlock={RenderBlock as any}
                    renderDecorator={renderDecorator}
                    renderListItem={renderListItem}
                    renderPlaceholder={renderPlaceholder}
                    renderStyle={renderStyle}
                  />
                </EditorFeatureFlagsContext.Provider>
              </ErrorBoundary>
              {loading ? <Loader /> : null}
            </div>
            {props.footer}
          </div>
        </EditorProvider>
      </ErrorBoundary>
    </div>
  );
}

function FocusOnMount() {
  const editor = useEditor();
  useEffect(() => {
    editor.send({ type: "focus" });
  }, [editor]);
  return null;
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
  if (LinkAnnotationSchema.safeParse(props).success) {
    return <span className="text-primary underline underline-offset-2">{props.children}</span>;
  }

  return props.children;
};

const RenderBlock = (props: BlockRenderProps) => {
  const enableDragHandles = useContext(EditorFeatureFlagsContext).dragHandles;
  const editor = useEditor();
  const readOnly = useEditorSelector(
    editor,
    (s: { context: { readOnly: boolean } }) => s?.context?.readOnly
  );

  const children = props.children;
  const invalid = useContext(InvalidBlocksContext).get(props.value._key);

  const block = blockByName(props.schemaType.name);
  if (block) {
    const content = block.Editor ? (
      <block.Editor
        value={props.value}
        selected={props.selected}
        focused={props.focused}
      />
    ) : (
      <div
        className={`rounded-md border-2 ${
          props.selected ? "border-primary" : "border-transparent"
        }`}
      >
        <block.View value={props.value} />
      </div>
    );
    if (!invalid) return content;
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-destructive p-2">
        {content}
        <p contentEditable={false} className="px-1 text-xs text-destructive">
          {invalid}
        </p>
      </div>
    );
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

const renderListItem: RenderListItemFunction = (props: any) => {
  return props.children;
};

const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-muted-foreground">Share something with the club…</span>
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
  [
    "code",
    (props) => (
      <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em]">
        {props.children}
      </code>
    ),
  ],
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
    // Same sizes as displayBlocks, so the draft looks like the post.
    ["h1", (props) => <h3 className="mt-4 mb-2 text-2xl font-bold">{props.children}</h3>],
    ["h2", (props) => <h4 className="mt-4 mb-2 text-xl font-semibold">{props.children}</h4>],
    ["h3", (props) => <h5 className="mt-3 mb-2 text-lg font-semibold">{props.children}</h5>],
    ["h4", (props) => <h4 className="my-1">{props.children}</h4>],
    ["h5", (props) => <h5 className="my-1">{props.children}</h5>],
    ["h6", (props) => <h6 className="my-1">{props.children}</h6>],
    [
      "blockquote",
      (props) => (
        <blockquote className="my-3 border-s-2 border-border ps-4 italic text-muted-foreground">
          {props.children}
        </blockquote>
      ),
    ],
  ]);
