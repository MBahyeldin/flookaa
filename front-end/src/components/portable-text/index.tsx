import { useSelector } from "@xstate/react";
import type { PlaygroundActorRef } from "./toolbar/machine";
import { PlaygroundFeatureFlagsContext } from "./toolbar/feature-flags";
import Editor from "./editor";
import { useCallback, useEffect, useRef } from "react";
import type { PortableTextObject, PortableTextSpan, PortableTextTextBlock } from "@portabletext/block-tools";

export default function PortableText(props: {
  playgroundRef: PlaygroundActorRef;
  value: PortableTextTextBlock<PortableTextSpan | PortableTextObject>[];
  setValue: (blocks: PortableTextTextBlock<PortableTextSpan | PortableTextObject>[]) => void;
}) {
  const playgroundFeatureFlags = useSelector(
    props.playgroundRef,
    (s) => s.context.featureFlags
  );
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors);
  const editor = editors[0]!;
  const rangeDecorations = useSelector(
    props.playgroundRef,
    (s) => s.context.rangeDecorations
  );

  /*
   * This is a controlled editor: the parent stores what the editor emits and
   * feeds it straight back in as `value`. Pushing a local edit back into the
   * editor replaces its document and drops the caret, which is why typing
   * misbehaved on the first character.
   *
   * The previous code did that push inside a `useMemo` whose dep array
   * included `props` — a fresh object every render — so it memoised nothing
   * and re-pushed the value on *every* render, not just on value changes.
   *
   * Instead: remember what the editor last handed us, and only push when the
   * incoming value is something else (an external reset, e.g. clearing the
   * composer after submit). Echoes of local edits are skipped.
   */
  const lastEmittedRef = useRef<string | null>(null);

  const { setValue } = props;
  const handleSetValue = useCallback(
    (blocks: PortableTextTextBlock<PortableTextSpan | PortableTextObject>[]) => {
      lastEmittedRef.current = JSON.stringify(blocks ?? []);
      setValue(blocks);
    },
    [setValue]
  );

  useEffect(() => {
    if (!editor) return;
    const incoming = JSON.stringify(props.value ?? []);
    if (incoming === lastEmittedRef.current) return;
    lastEmittedRef.current = incoming;
    editor.send({ type: "value", value: props.value });
  }, [editor, props.value]);

  return (
    // No padding here: every host of this component already sits inside a
    // padded card, so `p-2 md:p-4` double-padded the editor and inset it 16px
    // narrower than its siblings.
    <div className="flex min-w-0 flex-col gap-2 md:gap-4">
      <PlaygroundFeatureFlagsContext.Provider value={playgroundFeatureFlags}>
        <Editor
          key={editor.id}
          editorRef={editor}
          rangeDecorations={rangeDecorations}
          setValue={handleSetValue}
        />
      </PlaygroundFeatureFlagsContext.Provider>
    </div>
  );
}
